window.addEventListener('scroll', () => {
    const links = [...document.querySelectorAll('.hb-scrollbar a')]
        .filter(link => link.hash && link.hash !== '#');
    
    let closest = null;
    let closestDistance = Infinity;
    
    links.forEach(link => {
        const heading = document.querySelector(link.hash);
        if (!heading) return;
        const distance = Math.abs(heading.getBoundingClientRect().top);
        if (distance < closestDistance) {
            closestDistance = distance;
            closest = link.hash;
        }
    });

    links.forEach(link => {
        link.style.fontWeight = link.hash === closest ? '500' : '300';
    });
});