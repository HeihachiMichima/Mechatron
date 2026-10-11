<script>
  let { name, size = 22 } = $props();
  const P = {
    etat: 'M3 12h4l2-6 4 12 2-6h6',
    programmes: 'M8 3v3M16 3v3M8 18v3M16 18v3M3 8h3M3 16h3M18 8h3M18 16h3M6 6h12v12H6zM10 10h4v4h-4z',
    materiel: 'M14.5 5.5a4 4 0 0 0 5 5L12 18l-3 3-3-3 3-3 7.5-7.5zM4 20l3-3',
    robot: 'M7 8h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM12 4v4M12 3.5h.01M9.5 13h.01M14.5 13h.01M9 16.5h6M3 12v3M21 12v3',
    collectif: 'M3 21V10l5 3V10l5 3V10l5 3V5h3v16zM7 17h2M12 17h2M17 17h2',
    share: 'M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
    close: 'M6 6l12 12M18 6L6 18',
    dice: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    chevron: 'M9 6l6 6-6 6',
    sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
    auto: 'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    check: 'M5 12l5 5 9-10',
    combat: 'M12 2v5M12 17v5M2 12h5M17 12h5M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11v2',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    menu: 'M4 7h16M4 12h16M4 17h16',
    upload: 'M12 15V3M7 8l5-5 5 5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
    download: 'M12 3v12M7 10l5 5 5-5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
    history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
    users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 20v-1a4 4 0 0 0-3-3.8M16 4.2a3.5 3.5 0 0 1 0 6.6'
  };
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d={P[name]} />
</svg>
