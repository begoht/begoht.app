const ICON_PATHS = Object.freeze({
  location: `
    <circle cx="12" cy="12" r="3"></circle>
    <circle cx="12" cy="12" r="8"></circle>
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22"></path>
  `,
  navigation: `
    <path d="M4 4L20 10L13 13L10 20L4 4Z"></path>
  `,
  wallet: `
    <path d="M4 7A2 2 0 0 1 6 5H18A2 2 0 0 1 20 7V18A2 2 0 0 1 18 20H6A2 2 0 0 1 4 18V7Z"></path>
    <path d="M4 9H18A2 2 0 0 1 20 11V15H16A2 2 0 0 1 14 13A2 2 0 0 1 16 11H20"></path>
    <circle cx="16.5" cy="13" r=".5" fill="currentColor" stroke="none"></circle>
  `,
  shield: `
    <path d="M12 3L19 6V11C19 15.6 16.1 19.1 12 21C7.9 19.1 5 15.6 5 11V6L12 3Z"></path>
    <path d="M9 12L11 14L15 10"></path>
  `,
  chart: `
    <path d="M4 19V5M4 19H20"></path>
    <path d="M7 15L11 11L14 13L19 7"></path>
    <path d="M15 7H19V11"></path>
  `,
  bell: `
    <path d="M6 17H18L16.5 15V10A4.5 4.5 0 0 0 12 5.5A4.5 4.5 0 0 0 7.5 10V15L6 17Z"></path>
    <path d="M10 20H14"></path>
  `,
  pin: `
    <path d="M12 21S18 15.8 18 10A6 6 0 1 0 6 10C6 15.8 12 21 12 21Z"></path>
    <circle cx="12" cy="10" r="2"></circle>
  `,
  rider: `
    <circle cx="14.5" cy="5" r="2"></circle>
    <circle cx="6" cy="17" r="3"></circle>
    <circle cx="18" cy="17" r="3"></circle>
    <path d="M9 17L12 11L15 14H18"></path>
    <path d="M10 9H14L16 12"></path>
  `,
  star: `
    <path d="M12 3L14.8 8.7L21 9.6L16.5 14L17.6 20.2L12 17.3L6.4 20.2L7.5 14L3 9.6L9.2 8.7L12 3Z"></path>
  `
});

export function renderLandingIcon(name, className = "") {
  const paths = ICON_PATHS[name] || ICON_PATHS.navigation;
  const classAttribute = className ? ` class="${className}"` : "";

  return `
    <svg${classAttribute} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true" focusable="false">
      ${paths}
    </svg>
  `;
}
