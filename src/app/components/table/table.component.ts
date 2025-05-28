import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataNotFoundComponent } from '../data-not-found/data-not-found.component';

interface FilterField {
  key: string;
  label: string;
  type?: 'text' | 'select';
  options?: { label: string; value: any }[];
}

@Component({
  selector: 'app-table',
  imports: [FormsModule, CommonModule, DataNotFoundComponent],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() displayFields: string[] = [];
  @Input() headerLabels: { [key: string]: string } = {};
  @Input() roles: any[] = [];
  @Input() meta: any = { page: 1, totalPages: 1, total: 0, limit: 10 };
  @Input() pageSize: number | undefined = 5;
  @Input() imageFields: string[] = [];
  @Input() tableTitle: string = '';
  @Output() searchChanged = new EventEmitter<string>();
  @Input() filterFields: FilterField[] = [];
  @Output() filterChanged = new EventEmitter<any>();

  filters: { [key: string]: string } = {};
  filteredData: any[] = [];
  displayedData: any = [];
  headers: string[] = [];
  selectedRows: number[] = [];
  allSelected: boolean = false;

  currentPage: number = 1;
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.filters = {};
      this.filterFields.forEach((field) => {
        if (params[field.key]) {
          this.filters[field.key] = params[field.key];
        }
      });
      this.currentPage = params['page'] ? +params['page'] : 1;
      this.emitFilters();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.initializeHeaders();
      this.filteredData = this.data;
      this.displayedData = this.data; // No slicing!
    }
  }

  initializeHeaders() {
    if (this.data.length > 0) {
      if (this.displayFields.length > 0) {
        this.headers = this.displayFields;
      } else {
        this.headers = Object.keys(this.data[0]);
      }
    }
  }

  updateDisplayedData() {
    const startIndex = (this.currentPage - 1) * this.pageSize!;
    const endIndex = startIndex + this.pageSize!;
    this.displayedData = this.filteredData.slice(startIndex, endIndex);
  }

  getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  get hasData(): boolean {
    return this.displayedData.length > 0;
  }

  getHeaderLabel(key: string): string {
    return this.headerLabels[key] || key;
  }

  isSelected(id: number): boolean {
    return this.selectedRows.includes(id);
  }

  toggleAllSelection(event: any) {
    this.allSelected = event.target.checked;
    this.selectedRows = this.allSelected
      ? this.displayedData.map((row: any) => row.id)
      : [];
  }

  getSelectPlaceholder(field: FilterField): string {
    return 'Select ' + field.label;
  }

  getUniqueOptions(
    options: { label: string; value: any }[]
  ): { label: string; value: any }[] {
    const seen = new Set();
    return options.filter((opt) => {
      if (seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }

  onFilterChange() {
    const queryParams: any = { page: 1 };

    // Set query only for non-empty filters
    for (const key of Object.keys(this.filters)) {
      const value = this.filters[key];
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = value;
      } else {
        queryParams[key] = null; // This removes the param from URL
      }
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.emitFilters();
  }

  emitFilters() {
    this.filterChanged.emit(this.filters);
  }

  clearFilters() {
    this.filters = {};
    const clearParams: any = { page: 1 };
    for (const field of this.filterFields) {
      clearParams[field.key] = null;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: clearParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.emitFilters();
  }

  onBulkRemove() {
    if (
      confirm(
        `Are you sure you want to remove ${this.selectedRows.length} selected users?`
      )
    ) {
      console.log('Removing IDs:', this.selectedRows);
    }
  }

  toggleSelection(id: any) {
    if (id == null) {
      console.warn('Row ID is missing for selection toggle.');
      return;
    }
    const index = this.selectedRows.indexOf(id);
    if (index > -1) {
      this.selectedRows.splice(index, 1);
    } else {
      this.selectedRows.push(id);
    }
    this.allSelected = this.selectedRows.length === this.displayedData.length;
  }

  onPageChange(page: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  get pages(): number[] {
    return Array(this.meta.totalPages)
      .fill(0)
      .map((_, i) => i + 1);
  }

  onRemove(arg0: any) {
    throw new Error('Method not implemented.');
  }
  onEdit(arg0: any) {
    throw new Error('Method not implemented.');
  }
  onView(arg0: any) {
    throw new Error('Method not implemented.');
  }
}
