import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const MurreyColor = '#7B1842';
export const SoftPink = '#FDF2F5';
export const DeepPurple = '#2D0A1A';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: MurreyColor,
    secondary: '#A64D79',
    tertiary: '#45818E',
    surface: '#FFFFFF',
    background: '#F8F9FA',
    error: '#B00020',
    outline: MurreyColor,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: MurreyColor,
    secondary: '#D08BAE',
    tertiary: '#76B5C5',
    surface: '#1E1E1E',
    background: '#121212',
    error: '#CF6679',
    outline: MurreyColor,
  },
};
