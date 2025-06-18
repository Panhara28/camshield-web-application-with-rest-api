import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';
import { LayoutsComponent } from '../../../components/layouts/layouts.component';
import { PageTitleComponent } from '../../../components/page-title/page-title.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { MultipleUploadComponent } from '../../../components/multiple-upload/multiple-upload.component';
import { Variant } from '../../../models/variant.model';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaService } from '../../../services/medias.service';
import { CreateProductService } from '../../../services/create-product.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoryService } from '../../../services/categories-service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

interface PaginationMeta {
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
}

@Component({
  selector: 'app-create-product',
  imports: [
    LayoutsComponent,
    PageTitleComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    QuillModule,
    MultipleUploadComponent,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.css',
})
export class CreateProductComponent {
  @Output() mediaUrlsChanged = new EventEmitter<any[]>();
  // Variant Section
  variantOptions: {
    optionName: string;
    optionValue: any[];
  }[] = [];
  variants: any[] = ['size', 'color', 'material'];

  addOption() {
    const nextIndex = this.variantOptions.length;
    if (nextIndex < this.variants.length) {
      this.variantOptions.push({
        optionName: this.variants[nextIndex],
        optionValue: [{ value: null }],
      });
    } else {
      return;
    }
  }

  removeOption(optionIndex: number) {
    const indexToBeRemoved = optionIndex;
    this.variantOptions.splice(indexToBeRemoved, 1);
  }

  addVariantOptionValue(optionName: string) {
    const findVaraint = this.variantOptions.find(
      (item) => item.optionName == optionName
    );

    findVaraint?.optionValue.push({
      value: null,
    });
    console.log('variantOptions', this.variantOptions);
  }

  removeVariantOptionValue(optionIndex: number, valueIndex: number) {
    this.variantOptions[optionIndex].optionValue.splice(valueIndex, 1);
  }

  getAllVariantValues() {
    const result = this.variantOptions.map((opt: any) => ({
      optionName: opt.optionName,
      values: opt.optionValue.map((v: any) => v.value).filter(Boolean),
    }));

    console.log('Result', result);
  }

  product: any = {
    title: '',
    description: '',
    category: '',
    price: 0,
    compareAtPrice: 0,
    chargeTax: false,
    costPerItem: 0,
    trackQuantity: false,
    quantity: 0,
    continueSelling: false,
    sku: '',
    barcode: '',
    variants: [],
    mediaUrls: [],
  };

  categories: any[] = [];
  topLevelCategories: any[] = [];
  medias: any = [];
  meta: PaginationMeta = { page: 1, limit: 20, totalPages: 1, total: 0 };
  confirmedMediaUrls: Set<string> = new Set();
  confirmedMediaList: any[] = [];

  selectedMediaUrls: Set<string> = new Set();

  hasSku: boolean = false;
  profit: string = '';
  margin: string = '';
  totalInventory: number = 0;
  multipleUploadService: any;

  constructor(
    private route: ActivatedRoute,
    private mediaService: MediaService,
    private createProductService: CreateProductService,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService,
    private router: Router
  ) {}

  ngOnInit() {
    this.fetchCategories();
    this.route.queryParams.subscribe((params) => {
      this.mediaService.getMedias(params).subscribe((res) => {
        this.medias = res.data;
        this.meta = res.meta;
      });
    });
  }
  // Fetch and flatten category tree, then extract top-level categories
  fetchCategories(): void {
    this.categoryService.getCategoryTree().subscribe({
      next: (data) => {
        this.categories = this.flattenCategoryTree(data);
        this.topLevelCategories = this.categories.filter(
          (cat) => cat.level === 0
        );
      },
      error: (err) => console.error('Failed to load categories', err),
    });
  }

  // Get all immediate children (descendants) of a given category
  getAllDescendants(parent: any): any[] {
    return this.categories.filter((c) => c.parentId === parent.id);
  }

  // Recursively flatten a nested category tree and annotate levels
  flattenCategoryTree(nodes: any[], level: number = 0): any[] {
    return nodes.flatMap((node) => [
      { ...node, level },
      ...(node.children?.length
        ? this.flattenCategoryTree(node.children, level + 1)
        : []),
    ]);
  }

  // Display name with indent based on level (e.g., — — Subcategory)
  getIndentedName(cat: any): string {
    return '—'.repeat(cat.level) + ' ' + cat.name;
  }

  // Calculate and update profit and margin
  updateProfitMargin(): void {
    const price = this.product.price || 0;
    const cost = this.product.costPerItem || 0;
    const profit = price - cost;
    const margin = price > 0 ? (profit / price) * 100 : 0;

    this.profit = isNaN(profit) ? '' : `$${profit.toFixed(2)}`;
    this.margin = isNaN(margin) ? '' : `${margin.toFixed(1)}%`;
  }

  // Reset SKU and barcode fields if SKU toggle is off
  toggleSkuFields(): void {
    if (!this.hasSku) {
      this.product.sku = '';
      this.product.barcode = '';
    }
  }

  // Dynamically add input for new option value
  handleValueInput(
    input: HTMLInputElement,
    containerId: string,
    optionIndex: number
  ): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isLastInput = input === container.lastElementChild;
    const isFilled = input.value.trim() !== '';

    // Append new input only if last input is filled
    if (isLastInput && isFilled) {
      const newInput = document.createElement('input');
      newInput.type = 'text';
      newInput.className = 'form-control mt-2';
      newInput.placeholder = 'Add another value';
      newInput.addEventListener('input', () =>
        this.handleValueInput(newInput, containerId, optionIndex)
      );
      container.appendChild(newInput);
    }
  }

  // Submit full product payload with all variants and metadata
  submitProductForm(): void {
    const payload = {
      ...this.product,
      mediaUrls: this.product.mediaUrls,
      type: this.product.type || '',
    };

    this.createProductService.createProduct(payload).subscribe({
      next: (res: any) => {
        this.snackBar.open('✅ Product created successfully!', 'Close', {
          duration: 3000,
          panelClass: ['snack-success'],
        });

        // Redirect to edit page
        this.router.navigate([`/products/${res.slug}/edit`]);
      },
      error: () =>
        this.snackBar.open(
          '❌ Failed to create product. Please try again.',
          'Close',
          {
            duration: 3000,
            panelClass: ['snack-error'],
          }
        ),
    });
  }
  onMediaUrlsChanged(mediaList: any[]): void {
    this.product.mediaUrls = mediaList;
  }

  onModalFileSelected(files: FileList): void {
    const uploadFiles = Array.from(files);
    this.multipleUploadService.uploadFiles('multiple', uploadFiles).subscribe({
      next: (event: any) => {
        if (event?.body) {
          for (const file of event.body) {
            this.confirmedMediaUrls.add(file.url);
            this.selectedMediaUrls.add(file.url);
          }
          this.loadMediaList();
        }
      },
      error: (err: any) => console.error('Modal upload error:', err),
    });
  }
  // Load media list from query params and filter the confirmed media
  private loadMediaList(): void {
    const params = this.route.snapshot.queryParams;
    this.mediaService.getMedias(params).subscribe({
      next: (res) => {
        this.medias = res.data;
        this.meta = res.meta;

        // Filter medias that are already confirmed
        this.confirmedMediaList = this.medias.filter((m: any) =>
          this.confirmedMediaUrls.has(m.url)
        );
      },
      error: (err) => console.error('Failed to fetch medias:', err),
    });
  }

  // Cartesian product of all option values
  private cartesian(arr: string[][]): string[][] {
    return arr.reduce(
      (acc, curr) =>
        acc
          .map((x) => curr.map((y) => x.concat(y)))
          .reduce((a, b) => a.concat(b), []),
      [[]] as string[][]
    );
  }
}
