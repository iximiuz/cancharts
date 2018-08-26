### Lightweight Sunburst Chart via HTML5 canvas and Javascript
Example on <a href="http://iximiuz.github.io/cancharts/">github.io</a>.

It renders typical daily time distribution presented by data like this:

    {
        name: 'day',
        value: 24 * 60 * 60,
        children: [
            {
                name: 'work',
                value: 9 * 60 * 60,
                children: [
                    {
                        name: 'coding',
                        value: 6 * 60 * 60,
                        children: [
                            {name: 'python', value: 4 * 60 * 60},
                            {name: 'js', value: 2 * 60 * 60}
                        ]
                    },
                    {name: 'communicate', value: 1.5 * 60 * 60}
                ]
            },
            {name: 'sleep', value: 7 * 60 * 60},
            ...
    };


#### Usage
    var sunburst = new Sunburst(document.getElementById('canvas'), data, options);
    sunburst.render();

It is possible to zoom in/zoom out chart parts clicking by sections.
Also **mouse hover** available and has two modes: *separate nodes* and *path*.

**Options**:

    onHover    - callback called on mouse hover.
    onRender   - callback called on every chart render.
    hoverPath  - bool flag for hover mode.
    widthScale - scale for width of every continuous node level. Default value is 1.62.
