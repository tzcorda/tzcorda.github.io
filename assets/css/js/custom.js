window.addEventListener('scroll', () => {
    const links = document.querySelectorAll('.hb-scrollbar a');
    const headings = [...links].map(link => document.querySelector(link.hash));
    
    let current = '';
    headings.forEach(heading => {
        if (heading && heading.getBoundingClientRect().top < 150) {
            current = '#' + heading.id;
        }
    });

    links.forEach(link => {
        link.style.fontWeight = link.hash === current ? '600' : '300';
        link.style.color = link.hash === current ? '' : '';
    });
});