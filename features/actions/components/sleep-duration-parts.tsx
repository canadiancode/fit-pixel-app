import { Text, type StyleProp, type TextStyle } from "react-native";

export type SleepDurationPartsProps = {
  /** Duration in hours (may be fractional). */
  hours?: number;
  /** Duration in whole minutes. Takes precedence over `hours` when set. */
  minutes?: number;
  /** Optional leading sign for add deltas (`+` / `-`). */
  sign?: string;
  valueStyle: StyleProp<TextStyle>;
  unitStyle: StyleProp<TextStyle>;
  valueColor?: string;
};

/**
 * Renders sleep duration with smaller H/M unit labels than the numeric values
 * (same pattern as the sleep daily target stepper).
 */
export function SleepDurationParts({
  hours,
  minutes: minutesProp,
  sign,
  valueStyle,
  unitStyle,
  valueColor,
}: SleepDurationPartsProps) {
  const totalMinutes =
    minutesProp != null
      ? Math.round(minutesProp)
      : Math.round((hours ?? 0) * 60);
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const numberStyle = [valueStyle, valueColor != null && { color: valueColor }];

  if (abs === 0) {
    return (
      <>
        {sign != null ? <Text style={numberStyle}>{sign}</Text> : null}
        <Text style={numberStyle}>0</Text>
        <Text style={unitStyle}>M</Text>
      </>
    );
  }

  if (h === 0) {
    return (
      <>
        {sign != null ? <Text style={numberStyle}>{sign}</Text> : null}
        <Text style={numberStyle}>{m}</Text>
        <Text style={unitStyle}>M</Text>
      </>
    );
  }

  return (
    <>
      {sign != null ? <Text style={numberStyle}>{sign}</Text> : null}
      <Text style={numberStyle}>{h}</Text>
      <Text style={unitStyle}>H</Text>
      {m > 0 ? (
        <>
          <Text style={numberStyle}>{m}</Text>
          <Text style={unitStyle}>M</Text>
        </>
      ) : null}
    </>
  );
}
