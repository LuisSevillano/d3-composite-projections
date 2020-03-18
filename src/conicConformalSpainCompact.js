import { epsilon } from "./math";
import { geoConicConformal as conicConformal } from "d3-geo";
import { fitExtent, fitSize, fitWidth, fitHeight } from "./fit.js";
import { path } from "d3-path";

// The projections must have mutually exclusive clip regions on the sphere,
// as this will avoid emitting interleaving lines and polygons.
function multiplex(streams) {
  var n = streams.length;
  return {
    point: function(x, y) {
      var i = -1;
      while (++i < n) {
        streams[i].point(x, y);
      }
    },
    sphere: function() {
      var i = -1;
      while (++i < n) {
        streams[i].sphere();
      }
    },
    lineStart: function() {
      var i = -1;
      while (++i < n) {
        streams[i].lineStart();
      }
    },
    lineEnd: function() {
      var i = -1;
      while (++i < n) {
        streams[i].lineEnd();
      }
    },
    polygonStart: function() {
      var i = -1;
      while (++i < n) {
        streams[i].polygonStart();
      }
    },
    polygonEnd: function() {
      var i = -1;
      while (++i < n) {
        streams[i].polygonEnd();
      }
    }
  };
}

// A composite projection for Spain, configured by default for 960×500.
export default function() {
  var cache,
    cacheStream,
    peninsula = conicConformal()
      .rotate([5, -38.6])
      .parallels([0, 60]),
    peninsulaPoint,
    canarias = conicConformal()
      .rotate([5, -38.6])
      .parallels([0, 60]),
    canariasPoint,
    point,
    pointStream = {
      point: function(x, y) {
        point = [x, y];
      }
    };

  function conicConformalSpainCompact(coordinates) {
    var x = coordinates[0],
      y = coordinates[1];
    return (
      (point = null),
      (peninsulaPoint.point(x, y), point) || (canariasPoint.point(x, y), point)
    );
  }

  conicConformalSpainCompact.invert = function(coordinates) {
    var k = peninsula.scale(),
      t = peninsula.translate(),
      x = (coordinates[0] - t[0]) / k,
      y = (coordinates[1] - t[1]) / k;
    return (y >= clipY0 && y < clipY1 && x >= -clipX0 && x < -clipX1
      ? canarias
      : peninsula
    ).invert(coordinates);
  };

  conicConformalSpainCompact.stream = function(stream) {
    return cache && cacheStream === stream
      ? cache
      : (cache = multiplex([
          peninsula.stream((cacheStream = stream)),
          canarias.stream(stream)
        ]));
  };

  conicConformalSpainCompact.precision = function(_) {
    if (!arguments.length) return peninsula.precision();
    peninsula.precision(_), canarias.precision(_);
    return reset();
  };

  conicConformalSpainCompact.scale = function(_) {
    if (!arguments.length) {
      return peninsula.scale();
    }
    peninsula.scale(_);
    canarias.scale(_);
    return conicConformalSpainCompact.translate(peninsula.translate());
  };

  conicConformalSpainCompact.translate = function(_) {
    if (!arguments.length) return peninsula.translate();
    var k = peninsula.scale(),
      x = +_[0],
      y = +_[1];

    peninsulaPoint = peninsula
      .translate(_)
      .clipExtent([
        [x - 0.06857 * k, y - 0.1288 * k],
        [x + 0.13249 * k, y + 0.1 * k]
      ])
      .stream(pointStream);

    canariasPoint = canarias
      .translate([x + 0.178 * k, y - 0.085 * k])
      .clipExtent([
        [x - 0.053 * k + epsilon, y + 0.062 * k + epsilon],
        [x - -0.044 * k - epsilon, y + 0.1 * k - epsilon]
      ])
      .stream(pointStream);

    return reset();
  };

  conicConformalSpainCompact.fitExtent = function(extent, object) {
    return fitExtent(conicConformalSpainCompact, extent, object);
  };

  conicConformalSpainCompact.fitSize = function(size, object) {
    return fitSize(conicConformalSpainCompact, size, object);
  };

  conicConformalSpainCompact.fitWidth = function(width, object) {
    return fitWidth(conicConformalSpainCompact, width, object);
  };

  conicConformalSpainCompact.fitHeight = function(height, object) {
    return fitHeight(conicConformalSpainCompact, height, object);
  };

  function reset() {
    cache = cacheStream = null;
    return conicConformalSpainCompact;
  }

  conicConformalSpainCompact.drawCompositionBorders = function(context) {
    const extent = canarias.clipExtent();
    const ul = peninsula.invert([extent[0][0], extent[0][1]]);
    const ur = peninsula.invert([extent[1][0], extent[0][1]]);
    const ld = peninsula.invert([extent[1][0], extent[1][1]]);
    const ulCanaryIslands = peninsula(ul);
    const urCanaryIslands = peninsula(ur);
    const ldCanaryIslands = peninsula(ld);

    context.moveTo(ulCanaryIslands[0], ulCanaryIslands[1]);
    context.lineTo(urCanaryIslands[0], urCanaryIslands[1]);
    context.lineTo(ldCanaryIslands[0], ldCanaryIslands[1]);
  };
  conicConformalSpainCompact.getCompositionBorders = function() {
    const context = path();
    this.drawCompositionBorders(context);
    return context.toString();
  };

  return conicConformalSpainCompact.scale(2700);
}
