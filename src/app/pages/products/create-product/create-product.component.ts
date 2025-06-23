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

  generateVariants: { optionValue: any }[] = [];
  variantCombinations: string[] = [];
  groupedVariants: any = [];
  varaintOptionsLocalStorage: any[] = [];
  groupedVariantsLocalStorage: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private mediaService: MediaService,
    private createProductService: CreateProductService,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService,
    private router: Router,
    private localStorageServiceForAddVaraintOptionService: LocalStorageServiceForAddVaraintOptionService
  ) {}

  ngOnInit() {
    // Restore saved options
    this.localStorageServiceForAddVaraintOptionService
      .changes()
      .subscribe((data: any) => {
        if (!data) {
          console.warn('LocalStorage data is empty or null');
          localStorage.setItem('saveToLocalStorage', '[]');
          this.varaintOptionsLocalStorage = [];
        } else {
          this.varaintOptionsLocalStorage = JSON.parse(data);
          if (this.varaintOptionsLocalStorage.length > 0) {
            const result = this.generateVariantCombinations(
              this.varaintOptionsLocalStorage
            );
            this.groupedVariants = result;
          }
          console.log('this.groupedVariants ', this.groupedVariants);
        }
      });

    // ✅ Restore groupedVariantsLocalStorage on page refresh
    const savedGrouped = localStorage.getItem('groupedVariants');
    if (savedGrouped) {
      this.groupedVariantsLocalStorage = JSON.parse(savedGrouped);
    } else {
      this.groupedVariantsLocalStorage = [];
    }

    this.fetchCategories();
    this.route.queryParams.subscribe((params) => {
      this.mediaService.getMedias(params).subscribe((res) => {
        this.medias = res.data;
        this.meta = res.meta;
      });
    });

    this.varaintOptionsLocalStorage = this.varaintOptionsLocalStorage.filter(
      (group: any) => group?.optionValue?.length > 0
    );
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
      optionValue: [{ value: null, image: '', price: 0, stock: 0 }],
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
          localStorage.setItem(
            'saveToLocalStorage',
            JSON.stringify(this.varaintOptionsLocalStorage)
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
    if (!values.length) return [];

    const cartesian = (arr: string[][]): string[][] | any => {
      return arr.reduce(
        (a: any, b: any) => a.flatMap((d: any) => b.map((e: any) => [...d, e])),
        [[]]
      );
    };

    return cartesian(values).map((combo: any) => combo.join(' / '));
  }

  normalizeComboKey(combo: string): string {
    return combo
      .split(' / ')
      .map((part) => part.trim().toLowerCase())
      .join(' / ');
  }

  generateVariantCombinations(options: any): void | any {
    const optionValues = options
      .map((opt: any) => {
        if (opt.optionValue.length > 0) {
          return opt.optionValue
            .filter(
              (val: any) => val.value !== null && val.value?.trim() !== ''
            )
            .map((val: any) => {
              return {
                value: val.value,
                price: val.price || 0,
                stock: val.stock || 0,
                image: val.image || '',
              };
            });
        }

        // .filter((group: any) => group.length > 0); // 💥 Exclude any empty option groups
      })
      .filter((group: any) => group?.length! > 0);
    function cartesianProduct(arr: any[]) {
      if (arr.length === 0) return [];

      return arr.reduce((a, b) =>
        a.flatMap((d: any) =>
          b.map((e: any) => (Array.isArray(d) ? [...d, e] : [d, e]))
        )
      );
    }

    if (optionValues.length > 0) {
      const combinations = cartesianProduct(optionValues);
      const flatVariants = combinations.map((combo: any) => {
        const normalized = Array.isArray(combo) ? combo : [combo];
        return {
          varaint: normalized.map((item: any) => item.value).join('/'),
          price: normalized[0]?.price || 0,
          stock: normalized[0]?.stock || 0,
          image: normalized[0]?.image || '',
        };
      });

      // ✅ Group by the first option (usually size)
      const groupedMap: Record<string, any[]> = {};

      flatVariants.forEach((variant: any) => {
        const sizeKey = variant.varaint.split('/')[0];
        if (!groupedMap[sizeKey]) {
          groupedMap[sizeKey] = [];
        }
        groupedMap[sizeKey].push(variant);
      });

      const groupedResult = Object.keys(groupedMap).map((key) => ({
        groupedSize: key,
        variants: groupedMap[key],
      }));
      return groupedResult;
    }
  }

  getAllVariantValues() {
    this.generateVariants = [];
    this.variantCombinations = [];

    const combinations = this.generateCombinations();
    this.variantCombinations = combinations;

    // Step 1: Flatten old variant values
    const oldComboMap = new Map<
      string,
      { price: number; stock: number; image: string }
    >();
    this.groupedVariantsLocalStorage.forEach((group) => {
      group.variants.forEach((variant: any) => {
        const key = this.normalizeComboKey(variant.varaint);
        oldComboMap.set(key, {
          price: variant.price,
          stock: variant.stock,
          image: variant.image,
        });
      });
    });

    // Step 2: Preserve values with deepest match fallback
    const flatVariants = combinations.map((combo: string) => {
      const normalized = this.normalizeComboKey(combo);
      let old = oldComboMap.get(normalized);

      // Gradually reduce combo to find closest existing match
      if (!old) {
        const parts = normalized.split(' / ');
        for (let i = parts.length - 1; i > 0; i--) {
          const partial = parts.slice(0, i).join(' / ');
          const match = Array.from(oldComboMap.entries()).find(([key]) =>
            key.startsWith(partial)
          );
          if (match) {
            old = match[1];
            break;
          }
        }
      }

      return {
        varaint: combo,
        price: old?.price ?? 0,
        stock: old?.stock ?? 0,
        image: old?.image ?? '',
      };
    });

    // Step 3: Group by first option (e.g., Size)
    const groupedMap: Record<string, any[]> = {};
    flatVariants.forEach((variant) => {
      const first = variant.varaint.split(' / ')[0];
      if (!groupedMap[first]) groupedMap[first] = [];
      groupedMap[first].push(variant);
    });

    // Step 4: Save
    this.groupedVariants = Object.keys(groupedMap).map((key) => ({
      groupedSize: key,
      variants: groupedMap[key],
    }));
    this.groupedVariantsLocalStorage = this.groupedVariants;
    localStorage.setItem(
      'groupedVariants',
      JSON.stringify(this.groupedVariants)
    );
    this.saveTheVaraintToLocalStorage();
  }

  selecteOpenByVaraint(groupBySize: string, groupId: number) {
    const selectedIndex = groupBySize + '/' + groupId.toString();
  }

  convertVariantsToOptions(variants: any[], optionNames: string[]): any[] {
    const optionMap: Record<string, Map<string, any>> = {};

    // Initialize a Map for each optionName
    optionNames.forEach((name) => {
      optionMap[name] = new Map<string, any>();
    });

    variants.forEach((variant) => {
      const parts = variant.varaint.split('/');
      parts.forEach((value: string, index: number) => {
        const optionName = optionNames[index];
        const trimmedValue = value.trim(); // ✅ Fix here
        const currentMap = optionMap[optionName];

        if (!currentMap.has(trimmedValue)) {
          currentMap.set(trimmedValue, {
            value: trimmedValue, // ✅ Fix here
            price: variant.price,
            stock: variant.stock,
            image: variant.image || '',
          });
        }
      });
    });

    // Convert to desired array format
    const result = Object.entries(optionMap).map(([optionName, map]) => ({
      optionName,
      optionValue: Array.from(map.values()),
    }));

    return result;
  }

  saveTheVaraintToLocalStorage() {
    const allVariants = this.groupedVariants.flatMap(
      (group: any) => group.variants
    );
    console.log('allVariants', allVariants);
    const grouped = Object.values(
      allVariants.reduce((acc: any, item: any) => {
        const size = item.varaint.split('/')[0]; // Get the first part (e.g., "M")
        if (!acc[size]) {
          acc[size] = { groupedSize: size, variants: [] };
        }
        acc[size].variants.push(item);
        return acc;
      }, {} as Record<string, { groupedSize: string; variants: typeof allVariants }>)
    );
    console.log(grouped);

    // const options = this.convertVariantsToOptions(allVariants, [
    //   'size',
    //   'color',
    //   'material',
    // ]);
    // console.log('options', options);
    // localStorage.setItem('saveToLocalStorage', JSON.stringify(grouped));
  }

  autoAddVariantOptionValue(optionIndex: number, valueIndex: number) {
    const source =
      this.varaintOptionsLocalStorage.length > 0
        ? this.varaintOptionsLocalStorage
        : this.variantOptions;

    const option = source[optionIndex];
    const isLast = valueIndex === option.optionValue.length - 1;
    const currentValue = option.optionValue[valueIndex].value?.trim();

    // Auto-add new input field if user fills in the last one
    if (isLast && currentValue) {
      option.optionValue.push({ value: null, image: '', price: 0, stock: 0 });
    }

    // Persist current state
    localStorage.setItem('saveToLocalStorage', JSON.stringify(source));
    this.getAllVariantValues();
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
