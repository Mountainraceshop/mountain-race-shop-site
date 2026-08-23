/** Mountain Race Shop™ — protected Supabase booking administration. */
(function () {
  "use strict";

  const CONFIG_SRC = "assets/js/supabase-config.js";
  const SDK_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const tableBody = document.getElementById("bookingsTableBody");
  const emptyState = document.getElementById("bookingsEmpty");
  const toolbar = document.querySelector(".admin-toolbar");
  const table = document.querySelector(".bookings-table");

  if (!tableBody || !toolbar || !table) return;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (src !== SDK_SRC || window.supabase) resolve();
        else existing.addEventListener("load", resolve, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(script);
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function payloadValue(booking, key, fallback = null) {
    return booking[key] ?? booking.payload?.[key] ?? fallback;
  }

  function listValue(booking, key) {
    const value = payloadValue(booking, key, []);
    return Array.isArray(value) && value.length ? value.join(", ") : "—";
  }

  function createShell() {
    const authPanel = document.createElement("section");
    authPanel.id = "bookingAdminAuth";
    authPanel.className = "card";
    authPanel.style.marginBottom = "1rem";
    authPanel.innerHTML = `
      <h2 style="margin-top:0">Workshop sign-in</h2>
      <p class="admin-note">Sign in with the authorised Mountain Race Shop administrator account.</p>
      <form id="bookingAdminLogin" class="form-grid two-col">
        <div class="form-field">
          <label for="adminEmail">Email</label>
          <input id="adminEmail" type="email" autocomplete="username" required>
        </div>
        <div class="form-field">
          <label for="adminPassword">Password</label>
          <input id="adminPassword" type="password" autocomplete="current-password" required>
        </div>
        <div class="form-actions" style="grid-column:1/-1; justify-content:flex-start">
          <button class="button button-sm" type="submit">Sign in</button>
          <span id="adminAuthMessage" class="admin-note" style="margin:0"></span>
        </div>
      </form>`;
    toolbar.parentNode.insertBefore(authPanel, toolbar);

    const pickupPanel = document.createElement("section");
    pickupPanel.id = "pickupDateAdmin";
    pickupPanel.className = "card";
    pickupPanel.hidden = true;
    pickupPanel.style.marginBottom = "1rem";
    pickupPanel.innerHTML = `
      <h2 style="margin-top:0">Canberra pickup dates</h2>
      <p class="admin-note">Block, reopen or add a message to any Monday without editing website code.</p>
      <form id="pickupDateForm" class="form-grid two-col">
        <div class="form-field">
          <label for="pickupAdminDate">Monday date</label>
          <input id="pickupAdminDate" type="date" required>
        </div>
        <div class="form-field">
          <label for="pickupAdminStatus">Status</label>
          <select id="pickupAdminStatus">
            <option value="available">Available</option>
            <option value="full">Full</option>
            <option value="workshop_closed">Workshop closed</option>
            <option value="no_canberra_run">No Canberra run</option>
          </select>
        </div>
        <div class="form-field" style="grid-column:1/-1">
          <label for="pickupAdminMessage">Customer-facing message</label>
          <input id="pickupAdminMessage" type="text" placeholder="Optional explanation shown beside the date">
        </div>
        <div class="form-actions" style="grid-column:1/-1; justify-content:flex-start">
          <button class="button button-sm" type="submit">Save pickup date</button>
          <span id="pickupAdminResult" class="admin-note" style="margin:0"></span>
        </div>
      </form>
      <div id="pickupDateList" class="admin-note"></div>`;
    toolbar.parentNode.insertBefore(pickupPanel, toolbar);

    const headerRow = table.querySelector("thead tr");
    if (!headerRow.querySelector('[data-admin-column="source"]')) {
      const statusHeader = headerRow.lastElementChild;
      const source = document.createElement("th");
      source.dataset.adminColumn = "source";
      source.textContent = "Source";
      const notes = document.createElement("th");
      notes.dataset.adminColumn = "notes";
      notes.textContent = "Internal notes";
      headerRow.insertBefore(source, statusHeader);
      headerRow.insertBefore(notes, statusHeader);
    }

    const logout = document.createElement("button");
    logout.type = "button";
    logout.id = "adminLogout";
    logout.className = "button button-ghost button-sm";
    logout.textContent = "Sign out";
    logout.hidden = true;
    toolbar.appendChild(logout);
  }

  async function init() {
    createShell();
    await loadScript(CONFIG_SRC);
    const config = window.MRS_SUPABASE_CONFIG || {};
    if (!config.url || !config.anonKey) {
      document.getElementById("adminAuthMessage").textContent =
        "Supabase is not configured yet. Complete BOOKING_SYSTEM_SETUP.md first.";
      toolbar.hidden = true;
      return;
    }

    await loadScript(SDK_SRC);
    const client = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    const authPanel = document.getElementById("bookingAdminAuth");
    const loginForm = document.getElementById("bookingAdminLogin");
    const authMessage = document.getElementById("adminAuthMessage");
    const pickupPanel = document.getElementById("pickupDateAdmin");
    const logout = document.getElementById("adminLogout");
    let cachedBookings = [];

    async function verifyAdmin() {
      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return false;
      const { data, error } = await client
        .from("workshop_admin_users")
        .select("user_id,email")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) {
        await client.auth.signOut();
        authMessage.textContent = "This account is not authorised for workshop bookings.";
        return false;
      }
      return true;
    }

    function setSignedIn(signedIn) {
      authPanel.hidden = signedIn;
      toolbar.hidden = !signedIn;
      pickupPanel.hidden = !signedIn;
      table.parentElement.hidden = !signedIn;
      logout.hidden = !signedIn;
      if (emptyState) emptyState.hidden = true;
    }

    async function renderPickupDates() {
      const start = new Date().toISOString().slice(0, 10);
      const { data, error } = await client
        .from("pickup_date_settings")
        .select("pickup_date,status,customer_message,updated_at")
        .gte("pickup_date", start)
        .order("pickup_date", { ascending: true })
        .limit(24);
      const list = document.getElementById("pickupDateList");
      if (error) {
        list.textContent = `Could not load pickup settings: ${error.message}`;
        return;
      }
      list.innerHTML = data?.length
        ? `<strong>Saved date settings</strong><br>${data
            .map(
              (row) =>
                `${escapeHtml(row.pickup_date)} — ${escapeHtml(row.status)}${
                  row.customer_message ? ` — ${escapeHtml(row.customer_message)}` : ""
                }`
            )
            .join("<br>")}`
        : "No future date overrides. Mondays default to available until capacity is reached.";
    }

    function pickupLabel(booking) {
      if (!booking.wants_pickup_dropoff) return "No";
      const date = booking.preferred_monday_date || "—";
      const area = booking.pickup_area || "—";
      return `Yes — ${escapeHtml(booking.pickup_type || "pickup")}<br><small>${escapeHtml(date)} · ${escapeHtml(area)}</small>`;
    }

    async function renderBookings() {
      const { data, error } = await client
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        tableBody.innerHTML = `<tr><td colspan="16">Could not load bookings: ${escapeHtml(error.message)}</td></tr>`;
        return;
      }
      cachedBookings = data || [];
      tableBody.innerHTML = "";
      if (!cachedBookings.length) {
        if (emptyState) {
          emptyState.hidden = false;
          emptyState.textContent = "No central booking requests have been received yet.";
        }
        return;
      }
      if (emptyState) emptyState.hidden = true;

      for (const booking of cachedBookings) {
        const payload = booking.payload || {};
        const service = booking.selected_suspension_service || "—";
        const location = booking.suspension_service_location_type === "on_bike"
          ? "On bike"
          : booking.suspension_service_location_type === "off_bike"
            ? "Off bike"
            : "—";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(formatDate(booking.created_at))}</td>
          <td><strong>${escapeHtml(booking.customer_name)}</strong><br><small>${escapeHtml(booking.booking_id)}</small><br><a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a></td>
          <td><a href="tel:${escapeHtml(booking.phone)}">${escapeHtml(booking.phone)}</a></td>
          <td>${escapeHtml([booking.bike_brand, booking.bike_model, booking.bike_year].filter(Boolean).join(" "))}</td>
          <td>${escapeHtml(service)}</td>
          <td>${booking.suspension_service_price != null ? `$${escapeHtml(booking.suspension_service_price)}` : "—"}<br><small>${escapeHtml(location)}</small></td>
          <td>${booking.estimated_fixed_total != null ? `$${escapeHtml(booking.estimated_fixed_total)}` : "—"}</td>
          <td>${escapeHtml(listValue(booking, "selected_engine_services"))}</td>
          <td>${escapeHtml(listValue(booking, "selected_tyres"))}</td>
          <td>${payload.tyre_fitting_cost ? `$${escapeHtml(payload.tyre_fitting_cost)}` : "—"}</td>
          <td>${escapeHtml(listValue(booking, "brake_pad_check_options"))}</td>
          <td>${pickupLabel(booking)}</td>
          <td>${escapeHtml(booking.payment_preference || "—")}</td>
          <td>${escapeHtml([booking.source, booking.medium, booking.campaign].filter(Boolean).join(" / ") || "Direct")}</td>
          <td>
            <textarea data-note-id="${escapeHtml(booking.id)}" rows="3" style="min-width:220px">${escapeHtml(booking.internal_notes || "")}</textarea>
            <button type="button" class="button button-ghost button-sm save-note" data-id="${escapeHtml(booking.id)}">Save note</button>
          </td>
          <td>
            <select class="status-select" data-id="${escapeHtml(booking.id)}">
              ${window.BookingStorage.BOOKING_STATUSES.map(
                (status) => `<option value="${escapeHtml(status)}" ${status === booking.booking_status ? "selected" : ""}>${escapeHtml(status)}</option>`
              ).join("")}
            </select>
          </td>`;
        tableBody.appendChild(tr);
      }

      tableBody.querySelectorAll(".status-select").forEach((select) => {
        select.addEventListener("change", async () => {
          select.disabled = true;
          const { error } = await client
            .from("bookings")
            .update({ booking_status: select.value })
            .eq("id", select.dataset.id);
          select.disabled = false;
          if (error) {
            window.alert(`Status was not saved: ${error.message}`);
            await renderBookings();
          }
        });
      });

      tableBody.querySelectorAll(".save-note").forEach((button) => {
        button.addEventListener("click", async () => {
          const textarea = tableBody.querySelector(`[data-note-id="${button.dataset.id}"]`);
          button.disabled = true;
          const { error } = await client
            .from("bookings")
            .update({ internal_notes: textarea.value.trim() || null })
            .eq("id", button.dataset.id);
          button.disabled = false;
          button.textContent = error ? "Not saved" : "Saved";
          if (error) window.alert(`Note was not saved: ${error.message}`);
          window.setTimeout(() => (button.textContent = "Save note"), 1500);
        });
      });
    }

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      authMessage.textContent = "Signing in…";
      const email = document.getElementById("adminEmail").value.trim();
      const password = document.getElementById("adminPassword").value;
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error || !(await verifyAdmin())) {
        authMessage.textContent = error?.message || authMessage.textContent || "Sign-in failed.";
        setSignedIn(false);
        return;
      }
      authMessage.textContent = "";
      setSignedIn(true);
      await Promise.all([renderBookings(), renderPickupDates()]);
    });

    document.getElementById("pickupDateForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const result = document.getElementById("pickupAdminResult");
      const pickupDate = document.getElementById("pickupAdminDate").value;
      const status = document.getElementById("pickupAdminStatus").value;
      const customerMessage = document.getElementById("pickupAdminMessage").value.trim();
      const { data: sessionData } = await client.auth.getSession();
      const { error } = await client.from("pickup_date_settings").upsert({
        pickup_date: pickupDate,
        status,
        customer_message: customerMessage || null,
        updated_by: sessionData.session?.user?.id || null,
      });
      result.textContent = error ? `Not saved: ${error.message}` : "Pickup date saved.";
      if (!error) await renderPickupDates();
    });

    document.getElementById("refreshBookings")?.addEventListener("click", () =>
      Promise.all([renderBookings(), renderPickupDates()])
    );

    document.getElementById("exportBookings")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(cachedBookings, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mrs-bookings-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });

    logout.addEventListener("click", async () => {
      await client.auth.signOut();
      tableBody.innerHTML = "";
      setSignedIn(false);
    });

    const signedIn = await verifyAdmin();
    setSignedIn(signedIn);
    if (signedIn) await Promise.all([renderBookings(), renderPickupDates()]);
  }

  init().catch((error) => {
    console.error(error);
    tableBody.innerHTML = `<tr><td colspan="16">Booking administration failed to initialise: ${escapeHtml(error.message)}</td></tr>`;
  });
})();
