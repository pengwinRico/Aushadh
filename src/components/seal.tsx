import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

/** Points on the scalloped edge. A dozen reads as a seal at every size we use. */
const PETALS = 12;

type SealProps = PropsWithChildren<{
  size: number;
  /** Fill colour — usually a `Colors` entry chosen by the caller's tone. */
  color: string;
}>;

/**
 * The scalloped seal from the design: the action badges on buttons, the medicine
 * counts on category cards and the send button.
 *
 * Drawn from plain views — a ring of overlapping petal circles unioned with a solid
 * core — so it stays crisp everywhere without an SVG dependency or a font/symbol that
 * might not resolve on a given platform.
 */
export function Seal({ size, color, children }: SealProps) {
  const petal = size * 0.3;
  const ring = size / 2 - petal / 2;
  const core = size * 0.91;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: PETALS }, (_, index) => {
        const angle = (index / PETALS) * Math.PI * 2;

        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              width: petal,
              height: petal,
              borderRadius: petal / 2,
              backgroundColor: color,
              left: size / 2 + ring * Math.cos(angle) - petal / 2,
              top: size / 2 + ring * Math.sin(angle) - petal / 2,
            }}
          />
        );
      })}
      <View
        style={{
          position: 'absolute',
          width: core,
          height: core,
          borderRadius: core / 2,
          backgroundColor: color,
        }}
      />
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
