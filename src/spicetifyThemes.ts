import type {Theme} from './types';

// Adapted palette values from the user-provided spicetify-themes archive.
// The original CSS targets Spotify DOM nodes and cannot be applied directly
// to Melodify. Data columns: family|variant|background|surface|panel|text|muted|accent.
// Copyright 2019 morpheusthewhite and respective theme contributors, MIT.
// See THIRD_PARTY_THEMES.md for attribution.
const colors = `
Blossom|dark|1e2226|1e2226|282e33|ffffff|aaaaaa|6d80a3
BurntSienna|Base|303336|242629|242629|f4f3f6|a4a1ad|ef8450
Default|Ocean|0f111a|0f111a|00010a|ffffff|f1f1f1|f1f1f1
Dreary|Psycho|101010|171717|171717|e00000|ffffff|e00000
Dreary|Deeper|040614|0f111a|0f1118|4f9a87|406560|106165
Dreary|BIB|202020|202020|242424|8bc34a|b4b4b4|98da4b
Dreary|Mono|000000|5d5e60|5d5e60|ffffff|d3d3d3|d3d3d3
Dreary|Golden|1c1c1c|3b3b3b|3b3b3b|ffe002|b28228|b28228
Dreary|Graytone-Blue|111115|1e2027|0f1118|4f9a87|406560|106165
Dribbblish|base|000000|24b558|000000|ffffff|f0f0f0|24b558
Dribbblish|white|fff9f4|ffa789|fff9f4|363636|3d3d3d|ff8367
Dribbblish|dark|0a0e14|c2d935|0a0e14|f0f0f0|f0f0f0|c2d935
Dribbblish|dracula|44475a|6272a4|6272a4|f8f8f2|f8f8f2|8be9fd
Dribbblish|nord-light|eceff4|5e81ac|ebcb8b|2e3440|3b4252|81a1c1
Dribbblish|nord-dark|2e3440|88c0d0|2e3440|eceff4|e5e9f0|81a1c1
Dribbblish|purple|0a0e14|6f3c89|0a0e14|f1eaff|f1eaff|6f3c89
Dribbblish|samurai|461217|ebdbb2|461217|ebdbb2|ebdbb2|e7a52d
Dribbblish|beach-sunset|262626|bd3e3e|262626|ffffff|f0f0f0|c98430
Dribbblish|gruvbox|292828|689d6a|3c3836|fbf1c7|d5c4a1|cc241d
Dribbblish|gruvbox-material-dark|292828|1d2021|3c3836|fbf1c7|d5c4a1|a9b665
Dribbblish|rosepine|191724|2a2837|191724|ebbcba|f0f0f0|31748f
Dribbblish|lunar|161616|202020|161616|f3f3f3|cecece|0284e8
Dribbblish|catppuccin-latte|eff1f5|e6e9ef|eff1f5|4c4f69|5c5f77|7c7f93
Dribbblish|catppuccin-frappe|303446|292c3c|303446|c6d0f5|b5bfe2|949cbb
Dribbblish|catppuccin-macchiato|24273a|1e2030|24273a|cad3f5|b8c0e0|939ab7
Dribbblish|catppuccin-mocha|1e1e2e|181825|1e1e2e|cdd6f4|bac2de|9399b2
Dribbblish|tokyo-night|1a1b26|16161e|1a1b26|7aa2f7|bb9af7|ff9e64
Dribbblish|kanagawa|1f1f28|16161d|1f1f28|dcd7ba|c8c093|9cabca
Flow|Pink|ffe8d9|f5d4b7|ebaf98|8f7878|8f7878|8f7878
Flow|Green|e8f2e4|b7cfac|9bb78e|516847|797a78|516847
Flow|Silver|d3d8db|ffffff|b7bbbd|4c4d4f|8d9092|a8acad
Flow|Violet|e5dfeb|e8ede6|b9adc4|78658b|8e7c9a|a090b0
Flow|Ocean|cadbdb|c1d5d6|9cb9ba|62828a|7aa1a2|9cb9ba
Matte|matte|1c2228|181e23|232d35|b9bcc6|7e8596|01bfa5
Matte|periwinkle|ffffff|ffffff|ebebeb|010101|6d6d6d|8c84da
Matte|periwinkle-dark|383838|383838|444444|f6f6f6|d0d0d0|8c84da
Matte|porcelain|f9f9fb|dfe1e8|e3e6ea|3f4b56|70828f|038aff
Matte|rose-pine-moon|232136|232136|393552|e0def4|908caa|ebbcba
Matte|gray-dark1|202020|202020|2d2d2d|d4d4d4|959595|2080df
Matte|gray-dark2|202020|161616|2d2d2d|d4d4d4|959595|2080df
Matte|gray-dark3|161616|131313|2d2d2d|d4d4d4|959595|2080df
Matte|gray|383838|383838|4c4c4c|e9e9e9|aaaaaa|2888d7
Matte|gray-light|ffffff|ffffff|ebebeb|010101|6d6d6d|2888d7
Nightlight|Nightlight Colors|1c1622|241c2c|241c2c|ffffff|f1f1f1|ae1adb
Onepunch|dark|1d2021|1d2021|32302f|d5c4a1|b8bb26|8ec07c
Onepunch|light|f9f5d7|f9f5d7|f2e5bc|504945|79740e|427b58
Onepunch|legacy|16191a|16191a|32302f|b8bb26|d5c4a1|8ec07c
SharkBlue|Base|303336|242629|242629|f4f3f6|a4a1ad|0573ff
Sleek|Wealthy|202020|202020|242424|8bc34a|b4b4b4|98da4b
Sleek|Cherry|131c26|131c26|131c26|d98ba1|d7d7d7|ff84ac
Sleek|Coral|131c26|131c26|131c26|f88379|d7d7d7|fb958b
Sleek|Deep|020816|051024|0a1527|ffffff|ffffff|4a99e9
Sleek|Greener|020816|020816|020816|ffffff|ffffff|37b778
Sleek|Deeper|040614|0f111a|0c1c19|4f9a87|4f9a87|4a99e9
Sleek|Psycho|101010|171717|171717|c20000|ffffff|c20000
Sleek|UltraBlack|000000|000000|000000|ffffff|dedede|1db954
Sleek|Nord|2e3440|2e3440|2e3440|d8dee9|e5e9f0|81a1c1
Sleek|Futura|2e2837|2e2837|2e2837|34ad7e|dedede|00bf76
Sleek|Elementary|1f1f29|1d1821|2e2837|c59dff|dedede|f16d8c
Sleek|BladeRunner|181b1e|181b1e|17191d|dcd88c|9fbfb7|f6867c
Sleek|Dracula|282a36|282a36|282a36|50fa7b|bd93f9|00bf76
Sleek|VantaBlack|000000|000000|000000|666666|666666|333333
Sleek|RosePine|191724|191724|1f1d2e|e0def4|908caa|ebbcba
Sleek|Eldritch|212337|212337|212337|37f499|04d1f9|37f499
Sleek|Catppuccin|11111b|11111b|1e1e2e|cba6f7|7c7f93|f9e2af
Sleek|AyuDark|0b0e14|0b0e14|0b0e14|bfbdb6|565b66|e6b450
Sleek|TokyoNight|1a1b26|16161e|24283b|c0caf5|a9b1d6|7dcfff
StarryNight|Base|000000|142b44|152238|ffffff|adb5bd|fff3c4
StarryNight|Cotton-candy|000000|509be1|9f45b0|ffffff|fff4f4|d3e9ff
StarryNight|Forest|000000|14442b|011502|ffffff|adb5bd|9893da
StarryNight|Galaxy|000000|b133c9|9f45b0|ffe4f2|ffffff|fff3c4
StarryNight|Orange|000000|e69138|c37728|ffffff|ffffff|e06666
StarryNight|Sky|000000|62cff4|6b94f5|ffffff|040a18|fff3c4
StarryNight|Sunrise|000000|f83d41|c49c48|ffffff|e0e0e0|fff3c4
Ziro|blue-dark|1e2529|1e2529|171d20|bde6fb|6d8692|bde6fb
Ziro|blue-light|f5f7fa|f5f7fa|ffffff|123354|8495a7|22c5fd
Ziro|gray-dark|202020|202020|191919|ffffff|909090|ffffff
Ziro|gray-light|f7f7f7|f7f7f7|ffffff|29292a|909091|61717c
Ziro|green-dark|1b2421|1b2421|151c19|bbf1dd|6b8a7f|bbf1dd
Ziro|green-light|f6f9f9|f6f9f9|e5eceb|19483e|88a19c|2ae18e
Ziro|orange-dark|271e1b|271e1b|1e1715|fcc8b4|927367|fcc8b4
Ziro|orange-light|faf8f7|faf8f7|ffffff|563b25|a89a8e|ff8265
Ziro|purple-dark|221f26|221f26|1a181e|d8c4f1|7d718c|d8c4f1
Ziro|purple-light|f9f7f9|f9f7f9|ffffff|402b4d|9d91a3|9f74e7
Ziro|red-dark|271b1b|271b1b|1e1515|fdb4b4|6d8692|fdb4b4
Ziro|red-light|faf7f6|faf7f6|ffffff|572920|a9908b|ff5966
Ziro|rose-pine|191724|191724|26233a|e0def4|908caa|ebbcba
Ziro|rose-pine-moon|232136|232136|393552|e0def4|908caa|ea9a97
Ziro|rose-pine-dawn|f2e9e1|f2e9e1|faf4ed|575279|797593|d7827e
Ziro|tokyo-night|242638|242638|1c1d2b|b5b9d6|747f8d|b5b9d6
text|Spotify|121212|121212|121212|ffffff|b3b3b3|1db954
text|Spicetify|2e2837|2e2837|2e2837|ffffff|dedede|00e089
text|CatppuccinMocha|1e1e2e|1e1e2e|1e1e2e|cdd6f4|a6adc8|cba6f7
text|CatppuccinMacchiato|24273a|24273a|24273a|cad3f5|a5adcb|a6da95
text|CatppuccinLatte|303446|303446|303446|c6d0f5|a5adce|a6d189
text|Dracula|282a36|282a36|282a36|f8f8f2|6272a4|50fa7b
text|Gruvbox|282828|282828|282828|fbf1c7|bdae93|98971a
text|GruvboxHard|1d2021|1d2021|1d2021|ebdbb2|bdae93|98971a
text|Kanagawa|1f1f28|1f1f28|1f1f28|dcd7ba|c8c093|76946a
text|Nord|2e3440|2e3440|2e3440|eceff4|d8dee9|88c0d0
text|Rigel|002635|002635|002635|b7cff9|77929e|00cccc
text|RosePine|191724|191724|191724|e0def4|908caa|ebbcba
text|RosePineMoon|232136|232136|232136|e0def4|908caa|ea9a97
text|RosePineDawn|faf4ed|faf4ed|faf4ed|575279|797593|d7827e
text|Solarized|002b36|002b36|002b36|839496|586e75|859900
text|TokyoNight|1a1b26|1a1b26|1a1b26|a9b1d6|565f89|9ece6a
text|TokyoNightStorm|24283b|24283b|24283b|c0caf5|9aa5ce|9ece6a
text|ForestGreen|3e3e29|3e3e29|3e3e29|a3a3a3|838383|939393
text|EverforestDarkHard|272e33|272e33|272e33|d3c6aa|859289|a7c080
text|EverforestDarkMedium|2d353b|2d353b|2d353b|d3c6aa|859289|a7c080
text|EverforestDarkSoft|333c43|333c43|333c43|d3c6aa|859289|a7c080
text|FlexokiLight|fffcf0|fffcf0|fffcf0|100f0f|6f6e69|24837b
text|FlexokiDark|100f0f|100f0f|100f0f|cecdc3|878580|3aa99f
text|BloodMoon|0d0d0f|0d0d0f|0d0d0f|f4ecec|b59b9e|ff2244
`.trim();

export const spicetifyThemes:Theme[] = colors.split('\n').map(line => {
  const [family, variant, background, surface, panel, text, muted, accent] = line.split('|');
  const hex = (value:string) => '#' + value;
  return {
    id: 'spicetify-' + family.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + variant.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
    name: family + ' · ' + variant,
    description: 'Spicetify · ' + family,
    background: hex(background), surface: hex(surface), panel: hex(panel),
    text: hex(text), muted: hex(muted), accent: hex(accent),
    radius: 15, transparency: 0
  };
});

export const spicetifyFamilies = [...new Set(colors.split('\n').map(row => row.split('|')[0]))].sort((a,b) => a.localeCompare(b));
