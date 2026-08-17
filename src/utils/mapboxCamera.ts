import { UserTrackingMode } from '@rnmapbox/maps';

type CameraPadding = {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
};

/**
 * Android RNMBXCamera throws ClassCastException if followPadding is cleared to
 * undefined. Only attach followPadding while navigation follow mode is active.
 */
export function buildNavFollowCameraProps(options: {
  active: boolean;
  followUser: boolean;
  sheetHeight?: number;
}): Record<string, unknown> {
  const { active, followUser, sheetHeight = 280 } = options;

  if (!active) {
    return {
      followUserMode: UserTrackingMode.Follow,
      followZoomLevel: 15,
    };
  }

  const props: Record<string, unknown> = {
    followUserMode: followUser ? UserTrackingMode.FollowWithCourse : UserTrackingMode.Follow,
    followZoomLevel: followUser ? 18 : 15,
  };

  if (followUser) {
    props.followPitch = 60;
    props.followPadding = {
      paddingTop: 80,
      paddingBottom: Math.max(sheetHeight, 120) + 24,
      paddingLeft: 40,
      paddingRight: 40,
    } satisfies CameraPadding;
  }

  return props;
}

export function idleCameraStop(longitude: number, latitude: number) {
  return {
    centerCoordinate: [longitude, latitude] as [number, number],
    zoomLevel: 16,
    pitch: 0,
    heading: 0,
    animationDuration: 600,
  };
}
