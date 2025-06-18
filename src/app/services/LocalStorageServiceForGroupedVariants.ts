import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LocalStorageServiceForGroupedVariantsService {
  private storageKey = 'groupedVariants';
  private storageSubject = new BehaviorSubject<string | null>(this.get());

  set(value: string) {
    localStorage.setItem(this.storageKey, value);
    this.storageSubject.next(value); // Emit change
  }

  get(): string | null {
    return localStorage.getItem(this.storageKey);
  }

  changes() {
    return this.storageSubject.asObservable();
  }
}
