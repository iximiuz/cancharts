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

    function calcMetaData(rootDatum, scale) {
        var startWidth = rootNodeWidth(canvas, rootDatum, scale),
            meta = {
                root: {
                    data: rootDatum,
                    color: pickColor(rootDatum),
                    angles: {begin: 0, end: 2 * Math.PI, abs: 2 * Math.PI},
                    width: startWidth,
                    offset: 0,
                    children: []
                }
            },
            sibling;

        for (var i = 0, l = (rootDatum.children || []).length; i < l; i++) {
            if (rootDatum.children[i].value > rootDatum.value) {
                console.error('Child value greater than parent value.', rootDatum.children[i], rootDatum);
                continue;
            }

            sibling = calcChildMetaData(rootDatum.children[i], meta.root, sibling, scale);
            meta.root.children.push(sibling);
        }

        return meta;
    }

    function drawNode(nodeMeta, origin, ctx, options) {
        options = options || {};

        if (options.body || undefined === options.body) {
            nodeMeta.parent
                ? drawChildNodeBody(nodeMeta, origin, ctx)
                : drawRootNodeBody(nodeMeta, origin, ctx);
        }

        if (options.label) {
            nodeMeta.parent
                ? drawChildNodeLabel(nodeMeta, origin, ctx)
                : drawRootNodeLabel(nodeMeta, origin, ctx);
        }

        if (options.children || undefined == options.children) {
            for (var i = 0, l = (nodeMeta.children || []).length; i < l; i++) {
                drawNode(nodeMeta.children[i], origin, ctx, options);
            }
        }
    }

    function drawRootNodeBody(nodeMeta, origin, ctx) {
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, nodeMeta.width, nodeMeta.angles.begin, nodeMeta.angles.end);
        ctx.fillStyle = nodeMeta.hover ? 'red' : nodeMeta.color;
        ctx.fill();
    }

    function drawRootNodeLabel(nodeMeta, origin, ctx) {
        ctx.font = '20px Verdana';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(nodeMeta.data.name, origin.x, origin.y);
    }

    function drawChildNodeBody(nodeMeta, origin, ctx) {
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, nodeMeta.offset + nodeMeta.width / 2, nodeMeta.angles.begin, nodeMeta.angles.end);

        ctx.lineWidth = nodeMeta.width;
        ctx.strokeStyle = nodeMeta.hover ? 'red' : nodeMeta.color;
        ctx.stroke();
    }

    function drawChildNodeLabel(nodeMeta, origin, ctx) {
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
        ctx.translate(origin.x, origin.y);
        ctx.rotate(txtAngle);
        ctx.font = '20px Verdana';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(nodeMeta.data.name, xScale * (nodeMeta.offset + nodeMeta.width / 2), 0, nodeMeta.width);
        ctx.restore();
    }

    function drawSunburst(meta, origin, ctx) {
        drawNode(meta.root, origin, ctx);                             // draw bodies
        drawNode(meta.root, origin, ctx, {body: false, label: true}); // draw labels;
    }

    function getNodeByCartesianCoords(point, origin, metaData) {
        var difX = point.x - origin.x,
            difY = point.y - origin.y,
            distance = Math.sqrt(difX * difX + difY * difY),
            angle = Math.acos(difX / distance);

        if (difY < 0) {
            angle = 2 * Math.PI - angle;
        }

        return getNodeByPolarCoords({dist: distance, angle: angle}, metaData);
    }

    function getNodeByPolarCoords(point, metaData) {
        // todo: make index by origin offset and angle and use it instead of plain search

        function _findNode(point, nodeMeta) {
            // first check current node
            if (nodeMeta.offset >= point.dist) {
                // too far from origin to be our goal
                return null;
            }

            if (nodeMeta.offset < point.dist && point.dist <= nodeMeta.offset + nodeMeta.width) {
                // level found. Checking angle
                if (nodeMeta.angles.begin < point.angle && point.angle <= nodeMeta.angles.end) {
                    return nodeMeta;
                }
            } else {
                // we need to go deeper. Searching in children
                var node;
                for (var i = 0, l = (nodeMeta.children || []).length; i < l; i++) {
                    if (node = _findNode(point, nodeMeta.children[i])) {
                        return node;
                    }
                }
            }

            return null;
        }

        return _findNode(point, metaData.root);
    }

    function getCanvasPointerPos(event, canvasRect, canvasWidth, canvasHeight) {
        return {
            x: Math.round((event.clientX - canvasRect.left) / (canvasRect.right - canvasRect.left) * canvasWidth),
            y: Math.round((event.clientY - canvasRect.top) / (canvasRect.bottom - canvasRect.top) * canvasHeight)
        };
    }


    // start
    var canvasRect = canvas.getBoundingClientRect(),
        canvasWidth = canvas.width,
        canvasHeight = canvas.height,
        ctx = canvas.getContext('2d'),
        origin = {x: canvasWidth / 2, y: canvasHeight / 2},
        metaData = calcMetaData(data, 1.62),
        throttleTimeout,
        prevHoveredNodeMeta,
        hoveredNodeMeta;

    drawSunburst(metaData, origin, ctx);

    canvas.addEventListener('mousemove', function(event) {
        clearTimeout(throttleTimeout);

        throttleTimeout = setTimeout(function() {
            var pointerPos = getCanvasPointerPos(event, canvasRect, canvasWidth, canvasHeight);

            hoveredNodeMeta = getNodeByCartesianCoords(pointerPos, origin, metaData);
            if (prevHoveredNodeMeta && prevHoveredNodeMeta !== hoveredNodeMeta) {
                prevHoveredNodeMeta.hover = false;
                drawNode(prevHoveredNodeMeta, origin, ctx, {label: true, children: false})
            }

            if (hoveredNodeMeta && prevHoveredNodeMeta !== hoveredNodeMeta) {
                hoveredNodeMeta.hover = true;
                drawNode(hoveredNodeMeta, origin, ctx, {label: true, children: false})
            }

            prevHoveredNodeMeta = hoveredNodeMeta;
        }, 25);

    }, false);
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