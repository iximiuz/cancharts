'use strict';

var Cancharts = {
    Sunburst: require('./sunburst'),
    TradeSeries: require('./tradeseries')
};

module.exports = Cancharts;
if (typeof window !== 'undefined') {
    window.Cancharts = Cancharts;
}
