'use strict';

function Sunburst(canvas, data, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvasRect = canvas.getBoundingClientRect();
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    this.origin = {x: this.canvasWidth / 2, y: this.canvasHeight / 2};

    this.data = data;

    this.options = options || {};
    this.options.widthScale = this.options.widthScale || 1.62;

    var throttleTimeout, self = this, prevTargetNodeMeta;

    this.onMouseMove = function(event) {
        clearTimeout(throttleTimeout);

        throttleTimeout = setTimeout(function() {
            var targetNodeMeta = self.getNodeByCartesianCoords(self.getCanvasPointerPos(event));
            if (targetNodeMeta === prevTargetNodeMeta) {
                return;
            }

            if (targetNodeMeta) {
                options.hoverPath
                    ? self.hoverPath(targetNodeMeta)
                    : self.hoverNode(targetNodeMeta);
            }

            prevTargetNodeMeta = targetNodeMeta;
        }, 5);
    };

    this.onClick = function(event) {
        var targetNodeMeta = self.getNodeByCartesianCoords(self.getCanvasPointerPos(event)),
            targetNode;

        if (targetNodeMeta) {
            var findParent = function(currentData, tree) {
                var parent;
                for (var i = 0, l = (tree.children || []).length; i < l; i++) {
                    if (tree.children[i] === currentData) {
                        return tree;
                    }

                    if (parent = findParent(currentData, tree.children[i])) {
                        return parent;
                    }
                }

                return null;
            };

            targetNode = targetNodeMeta.parent
                ? targetNodeMeta.data
                : findParent(targetNodeMeta.data, self.data);
        }

        if (targetNode) {
            clearTimeout(throttleTimeout);

            self.render(targetNode);
        }
    };

    this.canvas.addEventListener('mousemove', this.onMouseMove, false);
    this.canvas.addEventListener('click', this.onClick, false);
}

Sunburst.prototype.deep = function(data) {
    var deeps = [];
    for (var i = 0, l = (data.children || []).length; i < l; i++) {
        deeps.push(this.deep(data.children[i]));
    }

    return 1 + Math.max.apply(Math, deeps.length ? deeps : [0]);
};

Sunburst.prototype.render = function(rootNode) {
    this.rootNode = rootNode || this.rootNode || this.data;

    this.calcMetaData();
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawNode(this.metaData.root);                             // draw bodies
    this.drawNode(this.metaData.root, {body: false, label: true}); // draw labels;

    if (this.options.onHover) {
        this.options.onHover();
    }

    if (this.options.onRender) {
        this.options.onRender();
    }
};

Sunburst.prototype.drawNode = function(nodeMeta, options) {
    function drawRootNodeBody(nodeMeta, origin, ctx) {
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, nodeMeta.width, nodeMeta.angles.begin, nodeMeta.angles.end);

        ctx.fillStyle = nodeMeta.hover ? 'red' : nodeMeta.color;
        ctx.fill();

        ctx.strokeStyle = 'white';
        ctx.stroke();
    }

    function drawRootNodeLabel(nodeMeta, origin, ctx) {
        ctx.font = '30px Verdana';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(nodeMeta.data.name, origin.x, origin.y);
    }

    function drawChildNodeBody(nodeMeta, origin, ctx) {
        ctx.beginPath();

        ctx.arc(origin.x, origin.y, nodeMeta.offset, nodeMeta.angles.begin, nodeMeta.angles.end);

        ctx.save();
        ctx.translate(origin.x, origin.y);
        ctx.rotate(nodeMeta.angles.end);
        ctx.lineTo(nodeMeta.offset + nodeMeta.width, 0);
        ctx.restore();

        ctx.arc(origin.x, origin.y, nodeMeta.offset + nodeMeta.width, nodeMeta.angles.end, nodeMeta.angles.begin, true);

        ctx.closePath();

        ctx.fillStyle = nodeMeta.hover ? 'red' : nodeMeta.color;
        ctx.fill();

        ctx.strokeStyle = 'white';
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
        ctx.font = 30 * nodeMeta.scale + 'px Verdana';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        // todo: adjust Y pos using font line-height prop and known arc length.
        ctx.fillText(nodeMeta.data.name, xScale * (nodeMeta.offset + nodeMeta.width / 2), 0, nodeMeta.width);
        ctx.restore();
    }

    options = options || {};

    if (options.body || undefined === options.body) {
        nodeMeta.parent
            ? drawChildNodeBody(nodeMeta, this.origin, this.ctx)
            : drawRootNodeBody(nodeMeta, this.origin, this.ctx);
    }

    if (options.label) {
        nodeMeta.parent
            ? drawChildNodeLabel(nodeMeta, this.origin, this.ctx)
            : drawRootNodeLabel(nodeMeta, this.origin, this.ctx);
    }

    if (options.children || undefined == options.children) {
        for (var i = 0, l = (nodeMeta.children || []).length; i < l; i++) {
            this.drawNode(nodeMeta.children[i], options);
        }
    }
};

Sunburst.prototype.pickColor = (function() {
    var i = 0,
        colors = ['rgb(86, 135, 209)', 'rgb(123, 97, 92)', 'rgb(222, 120, 59)',
            'rgb(106, 185, 117)', 'rgb(161, 115, 209)', 'rgb(187, 187, 187)'];

    return function() {
        return colors[i++ % colors.length];
    }
})();

Sunburst.prototype.rootNodeWidth = function() {
    var canvasSize = Math.min(this.canvasWidth, this.canvasHeight), div = 1;

    for (var i = 1, d = this.deep(this.rootNode); i < d; i++) {
        div += 1 / Math.pow(this.options.widthScale, i);
    }

    return canvasSize / 2 / div;
};

Sunburst.prototype.calcMetaData = function() {
    var startWidth = this.rootNodeWidth(),
        meta = {
            root: {
                data: this.rootNode,
                color: this.pickColor(),
                angles: {begin: 0, end: 2 * Math.PI, abs: 2 * Math.PI},
                width: startWidth,
                offset: 0,
                children: [],
                scale: 1
            }
        },
        sibling, self = this;

    function calcChildMetaData(childDatum, parentMeta, sibling, scale) {
        var meta = {
            data: childDatum,
            color: self.pickColor(),
            parent: parentMeta,
            width: parentMeta.width / scale,
            offset: parentMeta.offset + parentMeta.width,
            children: [],
            scale: parentMeta.scale / scale
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

    for (var i = 0, l = (this.rootNode.children || []).length; i < l; i++) {
        if (this.rootNode.children[i].value > this.rootNode.value) {
            console.error('Child value greater than parent value.', this.rootNode.children[i], this.rootNode);
            continue;
        }

        sibling = calcChildMetaData(this.rootNode.children[i], meta.root, sibling, this.options.widthScale);
        meta.root.children.push(sibling);
    }

    this.metaData = meta;
};

Sunburst.prototype.getNodeByCartesianCoords = function(point) {
    var difX = point.x - this.origin.x,
        difY = point.y - this.origin.y,
        distance = Math.sqrt(difX * difX + difY * difY),
        angle = Math.acos(difX / distance);

    if (difY < 0) {
        angle = 2 * Math.PI - angle;
    }

    return this.getNodeByPolarCoords({dist: distance, angle: angle}, this.metaData);
};

Sunburst.prototype.getNodeByPolarCoords = function(point) {
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

    return _findNode(point, this.metaData.root);
};

Sunburst.prototype.getCanvasPointerPos = function(event) {
    return {
        x: Math.round((event.clientX + document.body.scrollLeft - this.canvasRect.left)
            / (this.canvasRect.right - this.canvasRect.left) * this.canvasWidth),
        y: Math.round((event.clientY + document.body.scrollTop - this.canvasRect.top)
            / (this.canvasRect.bottom - this.canvasRect.top) * this.canvasHeight)
    };
};

Sunburst.prototype.hoverPath = function(targetNodeMeta, preserveNode) {
    if (this.metaData.hoveredNodeMeta && !preserveNode) {
        this.hoverNode(null, true);
    }

    if (this.metaData.hoveredPath) {
        var prevHovered = this.metaData.hoveredPath.pop();
        while (prevHovered) {
            prevHovered.hover = false;
            this.drawNode(prevHovered, {label: true, children: false});

            prevHovered = this.metaData.hoveredPath.pop();
        }
    }

    this.metaData.hoveredPath = [];
    while (targetNodeMeta) {
        targetNodeMeta.hover = true;
        this.drawNode(targetNodeMeta, {label: true, children: false});
        this.metaData.hoveredPath.push(targetNodeMeta);

        targetNodeMeta = targetNodeMeta.parent;
    }

    if (this.metaData.hoveredPath.length && this.options.onHover) {
        this.options.onHover(this.metaData.hoveredPath);
    }
};

Sunburst.prototype.hoverNode = function(targetNodeMeta, preservePath) {
    if (this.metaData.hoveredPath && !preservePath) {
        this.hoverPath(null, true);
    }

    if (this.metaData.hoveredNodeMeta && this.metaData.hoveredNodeMeta !== targetNodeMeta) {
        this.metaData.hoveredNodeMeta.hover = false;
        this.drawNode(this.metaData.hoveredNodeMeta, {label: true, children: false})
    }

    if (targetNodeMeta && this.metaData.hoveredNodeMeta !== targetNodeMeta) {
        this.metaData.hoveredNodeMeta = targetNodeMeta;
        this.metaData.hoveredNodeMeta.hover = true;
        this.drawNode(this.metaData.hoveredNodeMeta, {label: true, children: false})
    }

    if (this.metaData.hoveredNodeMeta && this.options.onHover) {
        this.options.onHover(this.metaData.hoveredNodeMeta);
    }
};

module.exports = Sunburst;
