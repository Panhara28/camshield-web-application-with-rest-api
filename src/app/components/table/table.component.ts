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

interface PaginationMeta {
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
}

interface FilterField {
  key: string;
  label: string;
  type?: 'text' | 'select';
  options?: { label: string; value: any }[];
}

@Component({
  selector: 'app-table',
  imports: [FormsModule, CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() meta: any = { page: 1, totalPages: 1, total: 0, limit: 10 };
  @Input() pageSize: number | undefined = 5;
  @Input() displayFields: string[] = [];
  @Input() imageFields: string[] = [];
  @Input() headerLabels: { [key: string]: string } = {};
  @Input() tableTitle: string = '';
  @Output() searchChanged = new EventEmitter<string>();
  @Input() filterFields: FilterField[] = [];
  @Output() filterChanged = new EventEmitter<any>();

  filters: { [key: string]: string } = {};
  searchTerm: string = '';
  currentPage: number = 1;
  filteredData: any[] = [];
  displayedData: any[] = [];
  headers: string[] = [];
  selectedRows: number[] = [];
  allSelected: boolean = false;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    for (const field of this.filterFields) {
      const value = this.route.snapshot.queryParamMap.get(field.key);
      if (value) {
        this.filters[field.key] = value;
      }
    }
    this.emitFilters();
  }

  onFilterChange() {
    const queryParams: any = { page: 1 };
    for (const key in this.filters) {
      if (this.filters[key]) {
        queryParams[key] = this.filters[key];
      }
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
    this.emitFilters();
  }

  emitFilters() {
    this.filterChanged.emit(this.filters);
  }

  isAnyFilterActive(): boolean {
    return Object.values(this.filters).some((val) => val);
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
    });
    this.emitFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.initializeHeaders();
      this.filteredData = this.data;
      this.updateDisplayedData();
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

  getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  getHeaderLabel(key: string): string {
    return this.headerLabels[key] || key;
  }

  updateDisplayedData() {
    const startIndex = (this.currentPage - 1) * this.pageSize!;
    const endIndex = startIndex + this.pageSize!;
    this.displayedData = this.filteredData.slice(startIndex, endIndex);
  }

  onEdit(id: number) {
    this.router.navigate([`/users/${id}/edit`]);
  }

  onView(id: number) {
    this.router.navigate([`/users/${id}`]);
  }

  onRemove(id: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      console.log('Remove user with ID:', id);
    }
  }

  toggleSelection(id: number) {
    const index = this.selectedRows.indexOf(id);
    if (index === -1) {
      this.selectedRows.push(id);
    } else {
      this.selectedRows.splice(index, 1);
    }
    this.allSelected = this.displayedData.every((row) =>
      this.selectedRows.includes(row.id)
    );
  }

  isSelected(id: number): boolean {
    return this.selectedRows.includes(id);
  }

  toggleAllSelection(event: any) {
    this.allSelected = event.target.checked;
    this.selectedRows = this.allSelected
      ? this.displayedData.map((row) => row.id)
      : [];
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

  get pages(): number[] {
    return Array(this.meta.totalPages)
      .fill(0)
      .map((_, i) => i + 1);
  }

  onPageChange(page: number): void {
    // if (Number(page) < 1 || Number(page) > this.meta.totalPages) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  filterData() {
    this.filteredData = this.data.filter((item) =>
      Object.values(item).some((value) =>
        value?.toString().toLowerCase().includes(this.searchTerm.toLowerCase())
      )
    );
    this.currentPage = 1;
    this.updateDisplayedData();
  }

  onSearchSubmit() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1, name: this.searchTerm },
      queryParamsHandling: 'merge',
    });
  }

  isSearchActive(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  getSelectPlaceholder(field: FilterField): string {
    return 'Select ' + field.label;
  }
}
