export const HOME_GRID_ROW_SPANS = [1, 2, 3, 4] as const;

export type HomeGridRowSpan = (typeof HOME_GRID_ROW_SPANS)[number];
export type HomeGridViewport = "desktop" | "tablet" | "mobile";

export type HomeGridPlacement = {
  columnSpan: number;
  columnStart: "auto" | 1;
  rowSpan: HomeGridRowSpan;
};

export type HomeGridStyle = Record<`--${string}`, string | number>;

type HomeGridLayout = {
  desktopSpan: "full" | "wide" | "half" | "narrow";
  rowSpan: HomeGridRowSpan;
  breakBefore: boolean;
};

type LegacyHomeModuleHeight = "auto" | "compact" | "standard" | "spacious";

const desktopColumnsBySpan: Record<HomeGridLayout["desktopSpan"], number> = {
  full: 12,
  wide: 8,
  half: 6,
  narrow: 4,
};

const rowSpanByLegacyHeight: Record<LegacyHomeModuleHeight, HomeGridRowSpan> = {
  auto: 1,
  compact: 1,
  standard: 2,
  spacious: 3,
};

export function isHomeGridRowSpan(value: unknown): value is HomeGridRowSpan {
  return typeof value === "number" && HOME_GRID_ROW_SPANS.includes(value as HomeGridRowSpan);
}

export function rowSpanFromLegacyHeight(value: unknown): HomeGridRowSpan | null {
  return typeof value === "string" && value in rowSpanByLegacyHeight
    ? rowSpanByLegacyHeight[value as LegacyHomeModuleHeight]
    : null;
}

export function resolveHomeGridPlacement(
  layout: HomeGridLayout,
  viewport: HomeGridViewport,
): HomeGridPlacement {
  if (viewport === "mobile") {
    return { columnSpan: 1, columnStart: 1, rowSpan: 1 };
  }

  const columnSpan = viewport === "desktop"
    ? desktopColumnsBySpan[layout.desktopSpan]
    : layout.desktopSpan === "full" || layout.desktopSpan === "wide"
      ? 2
      : 1;

  return {
    columnSpan,
    columnStart: layout.breakBefore ? 1 : "auto",
    rowSpan: layout.rowSpan,
  };
}

export function homeGridPreviewStyle(
  layout: HomeGridLayout,
  viewport: HomeGridViewport,
): HomeGridStyle {
  const placement = resolveHomeGridPlacement(layout, viewport);

  return {
    "--home-grid-column-span": placement.columnSpan,
    "--home-grid-column-start": placement.columnStart,
    "--home-grid-row-span": placement.rowSpan,
  };
}

export function homeGridResponsiveStyle(layout: HomeGridLayout): HomeGridStyle {
  const desktop = resolveHomeGridPlacement(layout, "desktop");
  const tablet = resolveHomeGridPlacement(layout, "tablet");

  return {
    "--home-desktop-column-span": desktop.columnSpan,
    "--home-desktop-column-start": desktop.columnStart,
    "--home-desktop-row-span": desktop.rowSpan,
    "--home-tablet-column-span": tablet.columnSpan,
    "--home-tablet-column-start": tablet.columnStart,
    "--home-tablet-row-span": tablet.rowSpan,
  };
}
