import { StyleSheet, View } from 'react-native';

/** Line and dot weight, sampled from the design. */
const STROKE = 3.5;
const DOT = 8;

type SparklineProps = {
  /** Values from top (0) to bottom (1), oldest first. */
  points: readonly number[];
  color: string;
  width?: number;
  height?: number;
};

/**
 * The trend line on a parameter card.
 *
 * Each segment is a rotated view rather than an SVG path, which keeps the component
 * dependency-free and identical across platforms — at this size the polyline is
 * indistinguishable from the design's curve.
 */
export function Sparkline({ points, color, width = 108, height = 38 }: SparklineProps) {
  const inset = DOT / 2;
  const spanX = width - DOT;
  const spanY = height - DOT;
  const step = points.length > 1 ? spanX / (points.length - 1) : 0;
  const coords = points.map((value, index) => ({
    x: inset + index * step,
    y: inset + value * spanY,
  }));

  return (
    <View style={{ width, height }}>
      {coords.slice(0, -1).map((from, index) => {
        const to = coords[index + 1];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <View
            key={index}
            style={[
              styles.segment,
              {
                left: (from.x + to.x) / 2 - length / 2,
                top: (from.y + to.y) / 2 - STROKE / 2,
                width: length,
                backgroundColor: color,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.dot,
          { left: coords[coords.length - 1].x - inset, top: coords[coords.length - 1].y - inset, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    position: 'absolute',
    height: STROKE,
    borderRadius: STROKE / 2,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
});
