/**
 * Solarch CLI Ecosystem — Recommendation & Selection Provenance Contracts (Phase 0)
 *
 * Defines explicit separation between system recommendations (with explanations)
 * and final user/system selections.
 */

export interface Recommendation<T> {
  value: T
  reason: string
  source: 'application-type' | 'deployment' | 'feature' | 'desktop-runtime' | 'default'
}

export interface Selection<T> {
  value: T
  source: 'user' | 'recommendation' | 'default'
  recommendation?: Recommendation<T>
}

export interface SdkRecommendationItem {
  packageName: string
  reason: string
  source: 'application-type' | 'deployment' | 'feature' | 'desktop-runtime' | 'default'
}

export interface SdkSelectionInput {
  selected?: string[]
  recommended?: SdkRecommendationItem[]
  source?: 'user' | 'recommendation' | 'default'
}

export class SdkSelection {
  public readonly selected: ReadonlyArray<string>
  public readonly recommended: ReadonlyArray<SdkRecommendationItem>
  public readonly source: 'user' | 'recommendation' | 'default'

  constructor(input: SdkSelectionInput = {}) {
    this.source = input.source ?? 'default'
    this.recommended = Object.freeze([...(input.recommended || [])])

    if (input.selected) {
      this.selected = Object.freeze([...input.selected])
    } else if (input.recommended && input.recommended.length > 0) {
      this.selected = Object.freeze(input.recommended.map(r => r.packageName))
    } else {
      this.selected = Object.freeze([])
    }
  }

  /**
   * Returns true if user explicitly overrode the recommended SDK selection.
   */
  public isOverridden(): boolean {
    if (this.source === 'user') {
      const recNames = new Set(this.recommended.map(r => r.packageName))
      if (this.selected.length !== recNames.size) return true
      return !this.selected.every(s => recNames.has(s))
    }
    return false
  }

  public toJSON() {
    return {
      selected: [...this.selected],
      recommended: [...this.recommended],
      source: this.source,
      isOverridden: this.isOverridden(),
    }
  }
}
