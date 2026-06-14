import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoordinateParts } from '../../shared/utils/coordinates';

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
})
export class HeroComponent {
  private readonly coordinateMin = 10;
  private readonly coordinateMax = 100;
  private readonly pointerX = signal(0.5);
  private readonly pointerY = signal(0.5);

  protected readonly siteTitle = 'KOPIO OFFICE';
  protected readonly latitude = computed(() => this.buildCoordinateParts(1 - this.pointerY()));
  protected readonly longitude = computed(() => this.buildCoordinateParts(1 - this.pointerX()));

  protected trackPointer(event: MouseEvent): void {
    this.pointerX.set(clamp(event.clientX / window.innerWidth));
    this.pointerY.set(clamp(event.clientY / window.innerHeight));
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
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
