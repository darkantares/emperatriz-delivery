import { CustomColors } from './CustomColors';

const tintColorLight = CustomColors.primary;
const tintColorDark = CustomColors.primaryLight;

export default {
  light: {
    text: CustomColors.textDark,
    background: CustomColors.backgroundLight,
    tint: tintColorLight,
    tabIconDefault: CustomColors.neutralLight,
    tabIconSelected: tintColorLight,
    border: CustomColors.border,
    card: CustomColors.cardBackground,
    notification: CustomColors.primary,
  },
  dark: {
    text: CustomColors.textLight,
    background: CustomColors.backgroundDarkest,
    tint: tintColorDark,
    tabIconDefault: CustomColors.neutralLight,
    tabIconSelected: tintColorDark,
    border: CustomColors.border,
    card: CustomColors.cardBackground,
    notification: CustomColors.primary,
  },
};
