import * as React from 'react';
import { t_color_white as globalWhite } from '@patternfly/react-tokens';
import { createSvgIdUrl, SVGDefs } from '@patternfly/react-topology';
import { getImageForIconClass } from '@console/internal/components/catalog/catalog-item-icon';

type KnativeIconProps = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const FILTER_ID = 'KnativeIconOutlineFilterId';

const KnativeIcon: React.FC<KnativeIconProps> = ({ x, y, width, height }) => (
  <>
    <SVGDefs id={FILTER_ID}>
      <filter id={FILTER_ID}>
        <feOffset result="nw" in="SourceAlpha" dx="-0.5" dy="-0.5" />
        <feOffset result="ne" in="SourceAlpha" dx="0.5" dy="-0.5" />
        <feOffset result="se" in="SourceAlpha" dx="0.5" dy="0.5" />
        <feOffset result="sw" in="SourceAlpha" dx="-0.5" dy="0.5" />
        <feMerge result="blackborder">
          <feMergeNode in="nw" />
          <feMergeNode in="ne" />
          <feMergeNode in="se" />
          <feMergeNode in="sw" />
        </feMerge>
        <feFlood floodColor={globalWhite.value} />
        <feComposite in2="blackborder" operator="in" result="offsetColor" />
        <feMerge>
          <feMergeNode in="offsetColor" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </SVGDefs>
    <image
      key={`image-${FILTER_ID}`}
      x={x}
      y={y}
      width={width}
      height={height}
      xlinkHref={getImageForIconClass('icon-knative')}
      filter={createSvgIdUrl(FILTER_ID)}
    />
  </>
);

export default React.memo(KnativeIcon);
