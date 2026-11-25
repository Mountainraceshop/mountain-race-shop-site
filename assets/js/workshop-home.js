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

const stage = document.getElementById('supplier-film');
const play = stage?.querySelector('.film-play');

if (play) {
  play.hidden = false;
  play.addEventListener('click', () => {
    const video = document.createElement('iframe');
    video.src = 'https://www.youtube-nocookie.com/embed/w0-LYOQbuBA?autoplay=1';
    video.title = 'K-Tech Suspension ORSS Air2Spring conversion kit overview';
    video.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    video.allowFullscreen = true;
    stage.replaceChildren(video);
    video.focus();
  }, { once: true });
}
