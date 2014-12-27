function demo() {
    var hoveredContainer = document.getElementById('hovered'),
        addButton = document.getElementById('add-node-button'),
        addNodeBlock = document.getElementById('add-node-block'),
        inputWorkName = document.getElementById('work-name'),
        inputWorkTime = document.getElementById('work-minutes');

    var options = {
        onHover: function(target) {
            if (!Array.isArray(target)) { target = target ? [target] : []; }

            var html = '', i, l;
            for (i = target.length - 1; i >= 0; i--) {
                html += '<div>';

                html += '<div class="hovered-node" style="background-color:' + target[i].color + '">' +
                    target[i].data.name + ' (' + target[i].data.value / 60 + ' min)' + '</div>';

                if (target[i].parent) {
                    html += '<div class="hovered-node hovered-node-remove" style="background-color:' + target[i].color +
                        '" data-idx="' + i + '">x</div>';
                }

                html += '</div>';
            }

            hoveredContainer.innerHTML = html;

            if (target.length) {
                // removing hovered nodes
                var removeButtons = hoveredContainer.getElementsByClassName('hovered-node-remove');
                for (i = 0, l = removeButtons.length; i < l; i++) {
                    removeButtons[i].onclick = function(event) {
                        var dataNode = target[event.target.getAttribute('data-idx')];
                        if (dataNode && dataNode.parent) {
                            var idx = null;
                            for (var e in dataNode.parent.data.children) if (dataNode.parent.data.children.hasOwnProperty(e)) {
                                if (dataNode.data === dataNode.parent.data.children[e]) {
                                    idx = e;
                                }
                            }

                            if (null !== idx) {
                                dataNode.parent.data.children.splice(idx, 1);
                                sunburst.render();
                            }
                        }

                        hoveredContainer.innerHTML = '';
                    };
                }

                // adding new nodes to hovered
                addNodeBlock.style.display = 'block';
                addButton.innerHTML = 'Add to "' + target[0].data.name + '"';
                inputWorkTime.setAttribute(
                    'max',
                    (target[0].data.value - (target[0].data.children || []).reduce(function(acc, cur) {
                        return acc + cur.value;
                    }, 0)) / 60
                );

                addButton.onclick = function() {
                    if (!inputWorkName.value || !inputWorkTime.value) {
                        return;
                    }

                    target[0].data.children = target[0].data.children || [];
                    target[0].data.children.push({
                        name: inputWorkName.value,
                        value: inputWorkTime.value * 60
                    });

                    inputWorkName.value = '';
                    inputWorkTime.value = '';

                    sunburst.render();
                };
            } else {
                addNodeBlock.style.display = 'none';
            }
        },
        onRender: function() {
            document.getElementById('data').value = JSON.stringify(data, undefined, 2);
        }
    };

    document.getElementById('hover-path-switch').addEventListener('click', function(event) {
        options.hoverPath = event.target.checked;
    }, false);

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
                value: 2 * 60 * 60,
                children: [
                    {
                        name: 'subway',
                        value: 80 * 60
                    },
                    {
                        name: 'walking',
                        value: 40 * 60
                    }
                ]
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

    // start
    var sunburst = new Sunburst(document.getElementById('canvas'), data, options);
    sunburst.render();
}
