'use strict';


function sunburst(canvas, data) {
    function deep(data) {
        var deeps = [];
        for (var i = 0, l = (data.children || []).length; i < l; i++) {
            deeps.push(deep(data.children[i]));
        }

        return 1 + Math.max.apply(Math, deeps.length ? deeps : [0]);
    }

    function rootNodeWidth(canvas, data, scale) {
        var canvasSize = Math.min(canvas.width, canvas.height), div = 1;

        scale = scale || 1.62;
        for (var i = 1, d = deep(data); i < d; i++) {
             div += 1 / Math.pow(scale, i);
        }

        return canvasSize / 2 / div;
    }

    var pickColor = (function() {
        var i = 0,
            colors = ['blue', 'green', 'yellow', 'red', 'black', 'purple', 'orange', 'gray'];

        return function(nodeDatum) {
            return colors[i++ % colors.length];
        }
    })();

    function calcChildMetaData(childDatum, parentMeta, sibling, scale) {
        var meta = {
            data: childDatum,
            color: pickColor(childDatum),
            parent: parentMeta,
            width: parentMeta.width / scale,
            offset: parentMeta.offset + parentMeta.width,
            children: []
        }, childSibling;

        meta.angles = {abs: parentMeta.angles.abs * childDatum.value / parentMeta.data.value};
        meta.angles.begin = sibling ? sibling.angles.end : parentMeta.angles.begin;
        meta.angles.end = meta.angles.begin + meta.angles.abs;

        for (var i = 0, l = (childDatum.children || []).length; i < l; i++) {
            childSibling = calcChildMetaData(childDatum.children[i], meta, childSibling, scale);
            meta.children.push(childSibling);
        }

        return meta;
    }

    function calcMetaData(data, scale) {
        var startWidth = rootNodeWidth(canvas, data, scale),
            meta = {
                root: {
                    data: data,
                    color: pickColor(data),
                    angles: {begin: 0, end: 2 * Math.PI, abs: 2 * Math.PI},
                    width: startWidth,
                    offset: 0,
                    children: []
                }
            },
            sibling;

        for (var i = 0, l = (data.children || []).length; i < l; i++) {
            if (data.children[i].value > data.value) {
                console.error('Child value greater than parent value.', data.children[i], data);
                continue;
            }

            sibling = calcChildMetaData(data.children[i], meta.root, sibling, scale);
            meta.root.children.push(sibling);
        }

        return meta;
    }

    function drawNode(nodeMeta, x, y, ctx, options) {
        options = options || {};

        if (options.body || undefined === options.body) {
            nodeMeta.parent
                ? drawChildNodeBody(nodeMeta, x, y, ctx)
                : drawRootNodeBody(nodeMeta, x, y, ctx);
        }

        if (options.label) {
            nodeMeta.parent
                ? drawChildNodeLabel(nodeMeta, x, y, ctx)
                : drawRootNodeLabel(nodeMeta, x, y, ctx);
        }

        for (var i = 0, l = (nodeMeta.children || []).length; i < l; i++) {
            drawNode(nodeMeta.children[i], x, y, ctx, options);
        }
    }

    function drawRootNodeBody(nodeMeta, x, y, ctx) {
        ctx.arc(x, y, nodeMeta.width, nodeMeta.angles.begin, nodeMeta.angles.end);
        ctx.fillStyle = nodeMeta.color;
        ctx.fill();
        ctx.stroke();
    }

    function drawRootNodeLabel(nodeMeta, x, y, ctx) {
        ctx.font = '20px Verdana';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(nodeMeta.data.name, x, y);
    }

    function drawChildNodeBody(nodeMeta, x, y, ctx) {
        ctx.beginPath();
        ctx.arc(x, y, nodeMeta.offset + nodeMeta.width / 2, nodeMeta.angles.begin, nodeMeta.angles.end);

        ctx.lineWidth = nodeMeta.width;
        ctx.strokeStyle = nodeMeta.color;
        ctx.stroke();
    }

    function drawChildNodeLabel(nodeMeta, x, y, ctx) {
        var txtAngle = nodeMeta.angles.begin + nodeMeta.angles.abs / 2,
            xScale = 1;
        if (Math.PI / 2 < txtAngle && txtAngle <= Math.PI) {
            txtAngle += Math.PI;
            xScale = -1;
        } else if (Math.PI < txtAngle && txtAngle <= 3 * Math.PI / 2) {
            txtAngle -= Math.PI;
            xScale = -1;
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(txtAngle);
        ctx.font = '20px Verdana';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(nodeMeta.data.name, xScale * (nodeMeta.offset + nodeMeta.width / 2), 0, nodeMeta.width);
        ctx.restore();
    }

    function drawSunburst(meta, x, y, ctx) {
        // 1. draw root
        // 2. for each child draw child
        //     2.1. draw child itself
        //     2.2. for each child of child draw it
        //     2.3. draw remind time as unknown

        drawNode(meta.root, x, y, ctx);                             // draw bodies
        drawNode(meta.root, x, y, ctx, {body: false, label: true}); // draw labels;
    }

    drawSunburst(calcMetaData(data, 1.62), canvas.width / 2, canvas.height / 2, canvas.getContext('2d'));
}


var data = {
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
                        {
                            name: 'python',
                            value: 4 * 60 * 60
                        },
                        {
                            name: 'js',
                            value: 2 * 60 * 60
                        }
                    ]
                },
                {
                    name: 'communicate',
                    value: 1.5 * 60 * 60
                }
            ]
        },
        {
            name: 'sleep',
            value: 7 * 60 * 60
        },
        {
            name: 'trip',
            value: 2 * 60 * 60
        },
        {
            name: 'food',
            value: 2 * 60 * 60
        },
        {
            name: 'reading',
            value: 40 * 60
        }
    ]
};

sunburst(document.getElementById('canvas'), data);