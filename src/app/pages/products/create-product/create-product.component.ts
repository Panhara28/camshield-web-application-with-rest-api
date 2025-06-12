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
import { SingleMediaLibraryComponent } from '../../../components/single-media-library/single-media-library.component';
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
    SingleMediaLibraryComponent,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.css',
})
export class CreateProductComponent {
  @ViewChild('variantOptionsContainer') variantOptionsContainer!: ElementRef;
  @ViewChild('groupBySelect') groupBySelect!: ElementRef;
  @Output() mediaUrlsChanged = new EventEmitter<any[]>();

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
  variantDetailMap:
    | {
        [key: string]: {
          price: number;
          stock: number;
          imageVariant: string;
        };
      }
    | any = {};
  variantOptions: { id: string; name: string; values: string[] }[] = [];
  variantGroups: { label: string; variants: any[]; expanded?: boolean }[] = [];
  usedOptions: Set<string> = new Set();
  variantValues: { [key: string]: string[] } = {};
  groupedVariantData: { [key: string]: any[] } = {};
  collapsedGroups: Set<string> = new Set();
  categories: any[] = [];
  topLevelCategories: any[] = [];
  medias: any = [];
  meta: PaginationMeta = { page: 1, limit: 20, totalPages: 1, total: 0 };
  confirmedMediaUrls: Set<string> = new Set();
  confirmedMediaList: any[] = [];

  currentVariantForImage: any = null;
  selectedMediaUrls: Set<string> = new Set();
  showVariantsTable: boolean = false;

  defaultVariantOptions = ['Size', 'Color', 'Material'];
  groupBy: string = 'Size';
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

  // Add a new variant option (up to Size, Color, Material)
  addVariantOption(): void {
    const labels = ['Size', 'Color', 'Material'];
    const existingLabels = this.variantOptions
      .map((opt) => opt?.name)
      .filter(Boolean);
    const nextLabel = labels.find((label) => !existingLabels.includes(label));

    if (!nextLabel) {
      alert('Only Size, Color, and Material options are allowed.');
      return;
    }

    this.variantOptions.push({
      name: nextLabel,
      values: [''],
      id: `variant-${Date.now()}`,
    });
  }

  // Remove a variant option and regenerate combinations
  removeVariantOption(index: number): void {
    this.variantOptions.splice(index, 1);
    this.variantOptions = this.variantOptions.filter(
      (opt) => opt?.values?.length
    );
    this.generateVariants();
  }

  // Update option value in-place
  handleOptionValueChange(
    index: number,
    valueIndex: number,
    value: string
  ): void {
    this.variantOptions[index].values[valueIndex] = value;
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

    // Update the values array
    const values = Array.from(container.querySelectorAll('input'))
      .map((i) => i.value.trim())
      .filter((v) => v);
    this.variantOptions[optionIndex].values = values;
  }

  // Generate variant combinations and group them
  generateVariants(): void {
    const cleanedOptions = this.variantOptions.filter(
      (opt) => opt?.name && opt?.values?.length > 0
    );

    if (!cleanedOptions.length) {
      this.variantGroups = [];
      return;
    }

    const combinations = this.cartesian(
      cleanedOptions.map((opt) => opt.values)
    );
    const groupByIndex = ['Size', 'Color', 'Material'].indexOf(this.groupBy);
    const grouped: { [key: string]: Variant[] } = {};

    combinations.forEach((combo, idx) => {
      const groupKey = combo[groupByIndex];
      if (!groupKey) return;

      const variant: Variant = {
        price: this.product.price,
        stock: 0,
        image: '',
        sku: `${combo.join('-')}-SKU${idx + 1}`,
      };

      cleanedOptions.forEach((opt, i) => {
        const key = opt.name.toLowerCase();
        variant[key] = combo[i];
      });

      // Ensure required keys exist
      ['size', 'color', 'material'].forEach((key) => {
        if (!variant[key]) variant[key] = '';
      });

      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(variant);
    });

    this.variantGroups = Object.entries(grouped).map(([label, variants]) => ({
      label,
      variants,
      expanded: true,
    }));

    this.updateInventoryTotal();
  }

  // Preview variant image directly from file input (only local preview)
  previewVariantImage(input: HTMLInputElement): void {
    if (input.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'variant-image mt-2';
        input.parentElement?.appendChild(img);
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  // Calculate total stock across all variant rows
  updateInventoryTotal(): void {
    const inputs = document.querySelectorAll<HTMLInputElement>(
      '#variantTable input[type="number"]:nth-child(4)'
    );
    this.totalInventory = Array.from(inputs).reduce(
      (sum, input) => sum + Number(input.value || 0),
      0
    );
  }

  // Submit full product payload with all variants and metadata
  submitProductForm(): void {
    const cleanedOptions = this.usedOptionsArray
      .filter((opt) => this.variantValues[opt]?.length)
      .map((opt) => ({
        name: opt,
        values: this.variantValues[opt].filter((val) => val.trim()),
      }));

    const combinations = this.cartesian(
      cleanedOptions.map((opt) => opt.values)
    );
    const optionNames = cleanedOptions.map((opt) => opt.name);

    const variants = combinations.map((combo, idx) => {
      const variant: any = {};
      combo.forEach((value, i) => {
        variant[optionNames[i].toLowerCase()] = value;
      });

      const key = combo.join('||');
      const detail = this.variantDetailMap[key] || {
        price: 0,
        stock: 0,
        imageVariant: '',
      };

      return {
        ...variant,
        price: Number(detail.price),
        stock: detail.stock,
        imageVariant: detail.imageVariant,
        sku: `${combo.join('-')}-SKU${idx + 1}`,
      };
    });

    const payload = {
      ...this.product,
      variants,
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

  openVariantMediaModal(variant: any): void {
    this.currentVariantForImage = variant;
    // Integrate modal logic externally
  }

  onModalConfirmSelection(selectedUrls: string[]): void {
    if (this.currentVariantForImage && selectedUrls[0]) {
      this.updateVariantDetail(
        this.currentVariantForImage,
        'imageVariant',
        selectedUrls[0]
      );
      this.currentVariantForImage = null;
    }
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

  // Get used options as array
  get usedOptionsArray(): string[] {
    return Array.from(this.usedOptions);
  }

  // Add a new unused default option
  addOption() {
    const nextOption = this.defaultVariantOptions.find(
      (opt) => !this.usedOptions.has(opt)
    );
    if (!nextOption) return;
    this.usedOptions.add(nextOption);
    this.variantValues[nextOption] = [''];
  }

  // Remove option and associated values
  removeOption(option: string) {
    this.usedOptions.delete(option);
    delete this.variantValues[option];
  }

  // Add empty value input for an option
  addOptionValue(option: string) {
    this.variantValues[option].push('');
  }

  // Remove a specific value from an option
  removeOptionValue(option: string, index: number) {
    this.variantValues[option].splice(index, 1);
  }

  // Update value for an option at specific index
  updateOptionValue(option: string, index: number, event: Event | any) {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    this.variantValues[option][index] = value;
  }

  // TrackBy function for ngFor performance
  trackByIndex(index: number, item: any): number {
    return index;
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

  // Generate grouped variant object and preserve existing detail data
  generateGroupedVariantsObject() {
    // Clean and validate option values
    const cleanedOptions = this.usedOptionsArray
      .filter((opt) => this.variantValues[opt]?.length)
      .map((opt) => ({
        name: opt,
        values: this.variantValues[opt].filter((val) => val.trim() !== ''),
      }));

    if (cleanedOptions.length < 1) return;

    const optionNames = cleanedOptions.map((opt) => opt.name);
    const optionValues = cleanedOptions.map((opt) => opt.values);
    const newCombinations = this.cartesian(optionValues);

    // Preserve existing variant detail map
    const oldCombinations = Object.keys(this.variantDetailMap).map((k) =>
      k.split('||')
    );
    this.preserveVariantDetails(oldCombinations, newCombinations, optionNames);

    // Group variants by the first option
    const groupBy = optionNames[0];
    const groupIndex = optionNames.indexOf(groupBy);
    const grouped: { [key: string]: any[] } = {};

    newCombinations.forEach((combo) => {
      const variantObj: { [key: string]: any } = {};

      combo.forEach((value, idx) => {
        variantObj[optionNames[idx]] = value;
      });

      // Append preserved details
      const key = combo.join('||');
      Object.assign(variantObj, this.variantDetailMap[key]);

      // Grouping logic
      const groupKey = combo[groupIndex];
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(variantObj);
    });

    // Show variants table only if valid data exists
    this.showVariantsTable = this.hasValidVariants();
    this.groupedVariantData = grouped;
  }

  // Construct variant key from option values
  getVariantKey(variant: { [key: string]: string }): string {
    return this.usedOptionsArray.map((opt) => variant[opt]).join('||');
  }

  // Update a field in variant detail map (price, stock, or image)
  updateVariantDetail(
    variant: any,
    field: 'price' | 'stock' | 'imageVariant',
    value: any
  ) {
    const key = this.getVariantKey(variant);
    if (!this.variantDetailMap[key]) {
      this.variantDetailMap[key] = { price: 0, stock: 0, imageVariant: '' };
    }
    this.variantDetailMap[key][field] = value;
  }

  // Toggle collapse state for a variant group
  toggleGroupCollapse(groupKey: string) {
    if (this.collapsedGroups.has(groupKey)) {
      this.collapsedGroups.delete(groupKey);
    } else {
      this.collapsedGroups.add(groupKey);
    }
  }

  // Check if a variant group is collapsed
  isGroupCollapsed(groupKey: string): boolean {
    return this.collapsedGroups.has(groupKey);
  }

  /**
   * Preserves variant details (price, stock, imageVariant) when regenerating combinations.
   * Ensures that existing data is not lost if the same variant combination exists.
   *
   * @param oldCombinations - Previous combinations of variant values (e.g., [["M", "Red"]])
   * @param newCombinations - Newly generated combinations of variant values
   * @param optionNames - Names of the variant options (e.g., ["Size", "Color"])
   */
  preserveVariantDetails(
    oldCombinations: string[][],
    newCombinations: string[][],
    optionNames: string[]
  ) {
    const newMap: { [key: string]: any } = {};

    // Clone the current variant detail map for safe lookup
    const oldMap = Object.keys(this.variantDetailMap).reduce((acc, key) => {
      acc[key] = this.variantDetailMap[key];
      return acc;
    }, {} as { [key: string]: any });

    // For each new combination, retain old data if exists, else initialize default
    newCombinations.forEach((combo) => {
      const key = combo.join('||');
      if (oldMap[key]) {
        // Retain existing detail if key matches
        newMap[key] = oldMap[key];
      } else {
        // Initialize with default values if new
        newMap[key] = { price: 0, stock: 0, imageVariant: '' };
      }
    });

    // Replace the existing detail map with the new one
    this.variantDetailMap = newMap;
  }

  /**
   * Checks if there is at least one valid, non-empty variant value across all options.
   * Used to determine whether to show the variant table.
   *
   * @returns true if at least one non-empty value exists in variantValues
   */
  hasValidVariants(): boolean {
    return this.usedOptionsArray.some((opt) =>
      this.variantValues[opt]?.some((val) => val.trim() !== '')
    );
  }
}
