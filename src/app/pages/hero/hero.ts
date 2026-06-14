import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoordinateParts } from '../../shared/utils/coordinates';

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
})
export class HeroComponent implements OnInit, OnDestroy {
  private readonly coordinateMin = 10;
  private readonly coordinateMax = 99.999999;
  private readonly pointerX = signal(0.5);
  private readonly pointerY = signal(0.5);
  private readonly isCoarsePointer = signal(false);
  private readonly motionSupported = signal(false);
  private readonly motionEnabled = signal(false);
  private readonly motionDenied = signal(false);
  private readonly orientationHandler = (event: DeviceOrientationEvent) => {
    this.syncPointerFromOrientation(event);
  };

  protected readonly siteTitle = 'KOPIO OFFICE';
  protected readonly heroNavigationEnabled = signal(false);
  protected readonly homeRoute = '/home';
  protected readonly showMotionPrompt = computed(
    () => this.isCoarsePointer() && this.motionSupported() && !this.motionEnabled() && !this.motionDenied(),
  );
  protected readonly latitude = computed(() => this.buildCoordinateParts(1 - this.pointerY()));
  protected readonly longitude = computed(() => this.buildCoordinateParts(1 - this.pointerX()));
  protected readonly latitudeCompact = computed(() => this.interpolateCoordinate(1 - this.pointerY()).toFixed(4));
  protected readonly longitudeCompact = computed(() => this.interpolateCoordinate(1 - this.pointerX()).toFixed(4));

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.isCoarsePointer.set(window.matchMedia('(pointer: coarse)').matches);
    this.motionSupported.set('DeviceOrientationEvent' in window);
  }

  ngOnDestroy(): void {
    this.disableMotionTracking();
  }

  protected trackPointer(event: MouseEvent): void {
    if (this.motionEnabled() || this.isCoarsePointer()) {
      return;
    }

    this.pointerX.set(clamp(event.clientX / window.innerWidth));
    this.pointerY.set(clamp(event.clientY / window.innerHeight));
  }

  protected trackTouch(event: TouchEvent): void {
    const touch = event.touches.item(0);
    if (!touch || this.motionEnabled()) {
      return;
    }

    this.pointerX.set(clamp(touch.clientX / window.innerWidth));
    this.pointerY.set(clamp(touch.clientY / window.innerHeight));
  }

  protected async enableMotionTracking(): Promise<void> {
    if (!this.motionSupported() || this.motionEnabled()) {
      return;
    }

    try {
      const permissionState = await requestOrientationPermission();
      if (permissionState === 'denied') {
        this.motionDenied.set(true);
        return;
      }

      this.disableMotionTracking();
      window.addEventListener('deviceorientation', this.orientationHandler);
      this.motionEnabled.set(true);
      this.motionDenied.set(false);
    } catch {
      this.motionDenied.set(true);
    }
  }

  private buildCoordinateParts(ratio: number): CoordinateParts {
    const value = this.interpolateCoordinate(ratio).toFixed(6);
    const [whole = '00', fraction = '000000'] = value.split('.');
    const paddedFraction = fraction.padEnd(6, '0');

    return {
      major: `${whole}.${paddedFraction.slice(0, 3)}`,
      minor: paddedFraction.slice(3, 6),
    };
  }

  private interpolateCoordinate(ratio: number): number {
    return this.coordinateMin + clamp(ratio) * (this.coordinateMax - this.coordinateMin);
  }

  private syncPointerFromOrientation(event: DeviceOrientationEvent): void {
    const gamma = clampAxis(event.gamma, 45);
    const beta = clampAxis(event.beta, 60);

    this.pointerX.set(clamp((gamma + 1) / 2));
    this.pointerY.set(clamp((beta + 1) / 2));
  }

  private disableMotionTracking(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('deviceorientation', this.orientationHandler);
    this.motionEnabled.set(false);
  }
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampAxis(value: number | null, limit: number): number {
  if (value === null) {
    return 0;
  }

  return Math.min(1, Math.max(-1, value / limit));
}

async function requestOrientationPermission(): Promise<'granted' | 'denied'> {
  const orientationEvent = window.DeviceOrientationEvent as DeviceOrientationPermissionEvent;

  if (typeof orientationEvent.requestPermission !== 'function') {
    return 'granted';
  }

  return orientationEvent.requestPermission();
}

type DeviceOrientationPermissionEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};
