import { CustomColors } from './CustomColors';

const tintColorLight = CustomColors.secondary;
const tintColorDark = CustomColors.secondaryLight;

export default {
  light: {
    text: CustomColors.textLight,
    background: CustomColors.backgroundDarkest,
    tint: tintColorLight,
    tabIconDefault: CustomColors.neutralLight,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: CustomColors.textLight,
    background: CustomColors.backgroundDarkest,
    tint: tintColorDark,
    tabIconDefault: CustomColors.neutral,
    tabIconSelected: tintColorDark,
  },
};
