const menu = document.querySelector('.menu-toggle');
const navigation = document.getElementById('primary-navigation');

if (menu && navigation) {
  const mobile = window.matchMedia('(max-width: 1120px)');
  const setOpen = (open) => {
    menu.setAttribute('aria-expanded', String(open));
    navigation.hidden = mobile.matches && !open;
  };

  const resetMenu = () => {
    menu.hidden = !mobile.matches;
    setOpen(false);
  };
  resetMenu();
  mobile.addEventListener('change', resetMenu);
  menu.addEventListener('click', () => setOpen(navigation.hidden));
  navigation.addEventListener('click', (event) => {
    if (mobile.matches && event.target.closest('a')) setOpen(false);
  });
  menu.closest('header').addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      menu.focus();
    }
  });
}
