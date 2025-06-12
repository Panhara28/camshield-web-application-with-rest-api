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
import { ProductDetialService } from '../../../services/product-detail';

@Component({
  selector: 'app-edit-product',
  standalone: true,
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
  templateUrl: './edit-product.component.html',
  styleUrl: './edit-product.component.css',
})
export class EditProductComponent {
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
        [key: string]: { price: number; stock: number; imageVariant: string };
      }
    | any = {};
  variantValues: { [key: string]: string[] } = {};
  groupedVariantData: { [key: string]: any[] } = {};
  usedOptions: Set<string> = new Set();
  collapsedGroups: Set<string> = new Set();

  categories: any[] = [];
  topLevelCategories: any[] = [];
  medias: any = [];
  confirmedMediaUrls: Set<string> = new Set();
  confirmedMediaList: any[] = [];
  meta: any = {};

  currentVariantForImage: any = null;
  selectedMediaUrls: Set<string> = new Set();
  showVariantsTable: boolean = false;

  groupBy: string = 'Size';
  defaultVariantOptions = ['Size', 'Color', 'Material'];
  profit: string = '';
  margin: string = '';
  totalInventory: number = 0;

  constructor(
    private route: ActivatedRoute,
    private mediaService: MediaService,
    private productDetailService: ProductDetialService,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService,
    private router: Router
  ) {}

  ngOnInit() {
    this.fetchCategories();
    this.route.params.subscribe((params) => {
      const slug = params['id'];
      if (slug) this.loadProduct(slug);
    });

    this.route.queryParams.subscribe((params) => {
      this.mediaService.getMedias(params).subscribe((res) => {
        this.medias = res.data;
        this.meta = res.meta;
      });
    });
  }

  loadProduct(slug: string): void {
    this.productDetailService.getProductDetailBySlug(slug).subscribe({
      next: (res: any) => {
        this.product = { ...res };
        this.populateVariantState(res.variants);
        this.updateProfitMargin();
      },
      error: (err: any) => console.error('Failed to load product:', err),
    });
  }

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

  flattenCategoryTree(nodes: any[], level: number = 0): any[] {
    return nodes.flatMap((node) => [
      { ...node, level },
      ...(node.children?.length
        ? this.flattenCategoryTree(node.children, level + 1)
        : []),
    ]);
  }

  getAllDescendants(parent: any): any[] {
    return this.categories.filter((c) => c.parentId === parent.id);
  }

  updateProfitMargin(): void {
    const price = this.product.price || 0;
    const cost = this.product.costPerItem || 0;
    const profit = price - cost;
    const margin = price > 0 ? (profit / price) * 100 : 0;

    this.profit = isNaN(profit) ? '' : `$${profit.toFixed(2)}`;
    this.margin = isNaN(margin) ? '' : `${margin.toFixed(1)}%`;
  }

  get usedOptionsArray(): string[] {
    return Array.from(this.usedOptions);
  }

  addOption() {
    const nextOption = this.defaultVariantOptions.find(
      (opt) => !this.usedOptions.has(opt)
    );
    if (!nextOption) return;
    this.usedOptions.add(nextOption);
    this.variantValues[nextOption] = [''];
  }

  removeOption(option: string) {
    this.usedOptions.delete(option);
    delete this.variantValues[option];
  }

  addOptionValue(option: string) {
    this.variantValues[option].push('');
  }

  removeOptionValue(option: string, index: number) {
    this.variantValues[option].splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  updateOptionValue(option: string, index: number, event: Event | any) {
    const input = event.target as HTMLInputElement;
    this.variantValues[option][index] = input.value.trim();
  }

  generateGroupedVariantsObject() {
    const cleanedOptions = this.usedOptionsArray
      .filter((opt) => this.variantValues[opt]?.length)
      .map((opt) => ({
        name: opt,
        values: this.variantValues[opt].filter((val) => val.trim() !== ''),
      }));

    if (cleanedOptions.length < 1) return;

    const optionNames = cleanedOptions.map((opt) => opt.name);
    const newCombinations = this.cartesian(
      cleanedOptions.map((opt) => opt.values)
    );
    const oldCombinations = Object.keys(this.variantDetailMap).map((k) =>
      k.split('||')
    );

    this.preserveVariantDetails(oldCombinations, newCombinations, optionNames);

    const groupBy = optionNames[0];
    const groupIndex = optionNames.indexOf(groupBy);
    const grouped: { [key: string]: any[] } = {};

    newCombinations.forEach((combo) => {
      const variantObj: { [key: string]: any } = {};
      combo.forEach((val, idx) => {
        variantObj[optionNames[idx]] = val;
      });

      const key = combo.join('||');
      Object.assign(variantObj, this.variantDetailMap[key]);

      const groupKey = combo[groupIndex];
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(variantObj);
    });

    this.groupedVariantData = grouped;
    this.showVariantsTable = this.hasValidVariants();
  }

  getVariantKey(variant: { [key: string]: string }): string {
    return this.usedOptionsArray.map((opt) => variant[opt]).join('||');
  }

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

  preserveVariantDetails(
    oldCombinations: string[][],
    newCombinations: string[][],
    optionNames: string[]
  ) {
    const newMap: { [key: string]: any } = {};
    const oldMap = { ...this.variantDetailMap };

    newCombinations.forEach((combo) => {
      const key = combo.join('||');
      newMap[key] = oldMap[key] || { price: 0, stock: 0, imageVariant: '' };
    });

    this.variantDetailMap = newMap;
  }

  hasValidVariants(): boolean {
    return this.usedOptionsArray.some((opt) =>
      this.variantValues[opt]?.some((val) => val.trim() !== '')
    );
  }

  openVariantMediaModal(variant: any): void {
    this.currentVariantForImage = variant;
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

  onMediaUrlsChanged(mediaList: any[]): void {
    this.product.mediaUrls = mediaList;
  }

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

    const { MediaProductDetails, ...productWithoutMediaDetails } = this.product;

    const payload = {
      ...productWithoutMediaDetails,
      variants,
      mediaUrls: this.product.MediaProductDetails,
      type: this.product.type || '',
    };

    console.log(payload);
    // Uncomment this to enable API call:
    // this.createProductService.updateProduct(this.product.id, payload).subscribe({
    //   next: () => {
    //     this.snackBar.open('✅ Product updated successfully!', 'Close', {
    //       duration: 3000,
    //       panelClass: ['snack-success'],
    //     });
    //     this.router.navigate([`/products/${this.product.slug}/edit`]);
    //   },
    //   error: () =>
    //     this.snackBar.open('❌ Failed to update product. Please try again.', 'Close', {
    //       duration: 3000,
    //       panelClass: ['snack-error'],
    //     }),
    // });
  }

  cartesian(arr: string[][]): string[][] {
    return arr.reduce(
      (acc, curr) =>
        acc
          .map((x) => curr.map((y) => x.concat(y)))
          .reduce((a, b) => a.concat(b), []),
      [[]] as string[][]
    );
  }
  capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  populateVariantState(variants: any[]) {
    this.variantDetailMap = {};
    this.variantValues = {};
    this.usedOptions = new Set();

    const editableKeys = ['size', 'color', 'material'];

    variants.forEach((v) => {
      const keyParts: string[] = [];
      editableKeys.forEach((k) => {
        const val = v[k];
        if (val) {
          this.usedOptions.add(this.capitalize(k));
          if (!this.variantValues[this.capitalize(k)]) {
            this.variantValues[this.capitalize(k)] = [];
          }
          if (!this.variantValues[this.capitalize(k)].includes(val)) {
            this.variantValues[this.capitalize(k)].push(val);
          }
          keyParts.push(val);
        }
      });

      const key = keyParts.join('||');
      this.variantDetailMap[key] = {
        price: v.price ?? 0,
        stock: v.stock ?? 0,
        imageVariant: v.imageVariant ?? '',
      };
    });

    this.generateGroupedVariantsObject();
  }

  toggleGroupCollapse(groupKey: string) {
    if (this.collapsedGroups.has(groupKey)) {
      this.collapsedGroups.delete(groupKey);
    } else {
      this.collapsedGroups.add(groupKey);
    }
  }

  isGroupCollapsed(groupKey: string): boolean {
    return this.collapsedGroups.has(groupKey);
  }
}
