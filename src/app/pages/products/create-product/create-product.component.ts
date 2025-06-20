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
import { LocalStorageServiceForAddVaraintOptionService } from '../../../services/LocalStorageServiceForAddVaraintOption';
import { LocalStorageServiceForGroupedVariantsService } from '../../../services/LocalStorageServiceForGroupedVariants';

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
    optionValue: { value: string | null }[];
  }[] = [];

  variants: string[] = ['size', 'color', 'material'];

  generateVariants: { combo: string; price: number; stock: number }[] = [];
  variantCombinations: string[] = [];
  groupedVariants: any[] = [];
  varaintOptionsLocalStorage: any[] = [];
  groupedVariantsLocalStorage: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private mediaService: MediaService,
    private createProductService: CreateProductService,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService,
    private router: Router,
    private localStorageServiceForAddVaraintOptionService: LocalStorageServiceForAddVaraintOptionService,
    private localStorageServiceForGroupedVariantsService: LocalStorageServiceForGroupedVariantsService
  ) {}

  ngOnInit() {
    this.localStorageServiceForAddVaraintOptionService
      .changes()
      .subscribe((data: any) => {
        if (!data) {
          localStorage.setItem('saveToLocalStorage', '[]');
        } else {
          this.varaintOptionsLocalStorage = JSON.parse(data);
        }
      });

    this.localStorageServiceForGroupedVariantsService
      .changes()
      .subscribe((data: any) => {
        if (!data) {
          localStorage.setItem('groupedVariants', '[]');
        } else {
          this.groupedVariantsLocalStorage = JSON.parse(data);
        }
      });

    this.fetchCategories();
    this.route.queryParams.subscribe((params) => {
      this.mediaService.getMedias(params).subscribe((res) => {
        this.medias = res.data;
        this.meta = res.meta;
      });
    });
  }

  sortOptionsByDefinedOrder(optionsArray: any[]) {
    return optionsArray.sort(
      (a, b) =>
        this.variants.indexOf(a.optionName) -
        this.variants.indexOf(b.optionName)
    );
  }

  addOption() {
    const currentOptions =
      this.varaintOptionsLocalStorage.length > 0
        ? this.varaintOptionsLocalStorage.map((opt) => opt.optionName)
        : this.variantOptions.map((opt) => opt.optionName);

    const nextOption = this.variants.find(
      (variant) => !currentOptions.includes(variant)
    );

    if (!nextOption) return;

    const newOption = {
      optionName: nextOption,
      optionValue: [{ value: null }],
    };

    if (this.varaintOptionsLocalStorage.length > 0) {
      this.varaintOptionsLocalStorage.push(newOption);
      this.varaintOptionsLocalStorage = this.sortOptionsByDefinedOrder(
        this.varaintOptionsLocalStorage
      );
      localStorage.setItem(
        'saveToLocalStorage',
        JSON.stringify(this.varaintOptionsLocalStorage)
      );
    } else {
      this.variantOptions.push(newOption);
      this.variantOptions = this.sortOptionsByDefinedOrder(this.variantOptions);
      localStorage.setItem(
        'saveToLocalStorage',
        JSON.stringify(this.variantOptions)
      );
    }
  }

  extractOptionValues(optionName: string): string[] {
    const source =
      this.varaintOptionsLocalStorage.length > 0
        ? this.varaintOptionsLocalStorage
        : this.variantOptions;

    const found = source.find((opt) => opt.optionName === optionName);
    return found
      ? found.optionValue
          .map((v: any) => (v.value || '').trim())
          .filter((v: string) => v !== '')
      : [];
  }

  removeOption(optionIndex: number) {
    let removedOptionName = '';

    if (this.varaintOptionsLocalStorage.length > 0) {
      removedOptionName =
        this.varaintOptionsLocalStorage[optionIndex].optionName;
      this.varaintOptionsLocalStorage.splice(optionIndex, 1);
      this.varaintOptionsLocalStorage = this.sortOptionsByDefinedOrder(
        this.varaintOptionsLocalStorage
      );
      localStorage.setItem(
        'saveToLocalStorage',
        JSON.stringify(this.varaintOptionsLocalStorage)
      );
      this.getAllVariantValues(); // ✅ already here
    } else {
      removedOptionName = this.variantOptions[optionIndex].optionName;
      this.variantOptions.splice(optionIndex, 1);
      this.variantOptions = this.sortOptionsByDefinedOrder(this.variantOptions);
      localStorage.setItem(
        'saveToLocalStorage',
        JSON.stringify(this.variantOptions)
      );
      this.getAllVariantValues(); // ✅ add this here
    }

    // 🔥 Remove all variants in groupedVariantsLocalStorage that contain values of the removed option
    if (removedOptionName) {
      const removedValues = this.variants.includes(removedOptionName)
        ? this.extractOptionValues(removedOptionName)
        : [];

      this.groupedVariantsLocalStorage = this.groupedVariantsLocalStorage
        .map((group) => ({
          ...group,
          variants: group.variants.filter((variant: any) => {
            const normalizedCombo = this.normalizeComboKey(variant.combo);
            return !removedValues.some((value) =>
              normalizedCombo.includes(value)
            );
          }),
        }))
        .filter((group) => group.variants.length > 0);

      localStorage.setItem(
        'groupedVariants',
        JSON.stringify(this.groupedVariantsLocalStorage)
      );
    }
  }

  addVariantOptionValue(optionName: string) {
    if (this.varaintOptionsLocalStorage.length > 0) {
      const findVariant = this.varaintOptionsLocalStorage.find(
        (item) => item.optionName === optionName
      );

      if (findVariant) {
        findVariant.optionValue.push({ value: null });
      }
      localStorage.setItem(
        'saveToLocalStorage',
        JSON.stringify(this.varaintOptionsLocalStorage)
      );
    } else {
      const findVariant = this.variantOptions.find(
        (item) => item.optionName === optionName
      );

      if (findVariant) {
        findVariant.optionValue.push({ value: null });
      }
      localStorage.setItem(
        'saveToLocalStorage',
        JSON.stringify(this.variantOptions)
      );
    }
  }

  removeVariantOptionValue(optionIndex: number, valueIndex: number) {
    if (this.varaintOptionsLocalStorage.length > 0) {
      const option = this.varaintOptionsLocalStorage[optionIndex];
      option.optionValue.splice(valueIndex, 1);
      if (option.optionValue.length === 0) {
        option.optionValue.push({ value: null });
      }
      localStorage.setItem(
        'saveToLocalStorage',
        JSON.stringify(this.varaintOptionsLocalStorage)
      );

      this.getAllVariantValues(); // ✅ Add this line
    } else {
      const option = this.variantOptions[optionIndex];
      option.optionValue.splice(valueIndex, 1);
      if (option.optionValue.length === 0) {
        option.optionValue.push({ value: null });
      }
      localStorage.setItem(
        'saveToLocalStorage',
        JSON.stringify(this.variantOptions)
      );

      this.getAllVariantValues(); // ✅ Add this line
    }
  }

  getCleanedOptions(): string[][] {
    if (this.varaintOptionsLocalStorage.length > 0) {
      return this.varaintOptionsLocalStorage
        .map((opt) => {
          console.log('From getCleanedOptions(): ', 'This function Okay');
          localStorage.setItem(
            'saveToLocalStorage',
            JSON.stringify(this.varaintOptionsLocalStorage)
          );
          localStorage.setItem(
            'groupedVariants',
            JSON.stringify(this.groupedVariantsLocalStorage)
          );
          return opt.optionValue
            .map((val: any) => (val.value || '').trim())
            .filter((v: any) => v !== '');
        })
        .filter((values) => values.length > 0); // Ignore empty existed variant groups
    } else {
      localStorage.setItem(
        'saveToLocalStorage',
        JSON.stringify(this.variantOptions)
      );
      return this.variantOptions
        .map((opt) => {
          return opt.optionValue
            .map((val) => (val.value || '').trim())
            .filter((v) => v !== '');
        })
        .filter((values) => values.length > 0); // Ignore empty variant groups
    }
  }

  generateCombinations(): string[] {
    const values = this.getCleanedOptions();
    console.log('From generateCombinations():', values);
    if (!values.length) return [];

    const cartesian = (arr: string[][]): string[][] | any => {
      return arr.reduce(
        (a: any, b: any) => a.flatMap((d: any) => b.map((e: any) => [...d, e])),
        [[]]
      );
    };

    return cartesian(values).map((combo: any) => combo.join(' / '));
  }

  groupVariantsByFirstOption() {
    const grouped: {
      groupBySize: string;
      variants: {
        combo: string;
        price: number;
        stock: number;
        image: string;
      }[];
    }[] = [];

    const map = new Map<string, any[]>();

    for (const variant of this.generateVariants) {
      const parts = variant.combo.split(' / ');
      const groupKey = parts[0]; // Assume first option is Size

      const entry = {
        combo: variant.combo,
        price: variant.price,
        stock: variant.stock,
        image: '', // Default image
      };

      if (!map.has(groupKey)) {
        map.set(groupKey, [entry]);
      } else {
        map.get(groupKey)?.push(entry);
      }
    }

    // Format into final structure
    for (const [key, variants] of map.entries()) {
      grouped.push({
        groupBySize: key,
        variants: variants,
      });
    }
    return grouped;
  }

  normalizeComboKey(combo: string): string {
    return combo
      .split(' / ')
      .map((part) => part.trim())
      .join(' / ');
  }

  getAllVariantValues() {
    // Clear old state
    this.generateVariants = [];
    this.variantCombinations = [];

    // Generate new combinations
    const combinations = this.generateCombinations();
    this.variantCombinations = combinations;

    // Create a quick map from existing combos to preserve old values
    const oldVariantsMap = new Map<
      string,
      { price: number; stock: number; image: string }
    >();

    this.groupedVariantsLocalStorage.forEach((group) => {
      group.variants.forEach((variant: any) => {
        const normalizedCombo = this.normalizeComboKey(variant.combo);
        oldVariantsMap.set(normalizedCombo, {
          price: variant.price,
          stock: variant.stock,
          image: variant.image,
        });
      });
    });

    // Generate new variants and preserve data if available
    this.generateVariants = combinations.map((combo) => {
      const normalizedCombo = this.normalizeComboKey(combo);
      let old = oldVariantsMap.get(normalizedCombo);

      // 🧠 Subset fallback: use smaller combo like "Red" for "M/Red" or "L/Red"
      if (!old) {
        const newParts = normalizedCombo.split(' / ');
        for (let [oldCombo, data] of oldVariantsMap.entries()) {
          const oldParts = oldCombo.split(' / ');
          const isSubset =
            oldParts.every((part) => newParts.includes(part)) ||
            newParts.every((part) => oldParts.includes(part));

          if (isSubset) {
            old = data;
            break;
          }
        }
      }

      return {
        combo,
        price: old?.price ?? 0,
        stock: old?.stock ?? 0,
        image: old?.image ?? '',
      };
    });

    // Regroup by first option (e.g., size)
    this.groupedVariants = this.groupVariantsByFirstOption();

    // Sync localStorage and local copy
    this.groupedVariantsLocalStorage = [...this.groupedVariants];
    localStorage.setItem(
      'groupedVariants',
      JSON.stringify(this.groupedVariantsLocalStorage)
    );
  }

  selecteOpenByVaraint(groupBySize: string, groupId: number) {
    const selectedIndex = groupBySize + '/' + groupId.toString();
    console.log('selectedIndex', selectedIndex.replace(/\s+/g, ''));
  }

  saveTheVaraintToLocalStorage() {
    if (this.groupedVariantsLocalStorage.length > 0) {
      console.log(
        'groupedVariantsLocalStorage',
        this.groupedVariantsLocalStorage
      );
      localStorage.setItem(
        'groupedVariants',
        JSON.stringify(this.groupedVariantsLocalStorage)
      );
    } else {
      console.log('Save groupedVariants', this.groupedVariants);
      localStorage.setItem(
        'groupedVariants',
        JSON.stringify(this.groupedVariants)
      );
    }
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
