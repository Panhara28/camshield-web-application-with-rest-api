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
import { ActivatedRoute } from '@angular/router';
import { MediaService } from '../../../services/medias.service';

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
  ],
  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.css',
})
export class CreateProductComponent {
  @ViewChild('variantOptionsContainer', { static: false })
  variantOptionsContainer!: ElementRef;
  @ViewChild('groupBySelect', { static: false }) groupBySelect!: ElementRef;
  variantGroups: {
    label: string;
    variants: any[];
    expanded?: boolean; // Optional for toggling group visibility
  }[] = [];
  variantOptions: { id: string; name: string; values: string[] }[] = [];
  selectedMediaUrls: Set<string> = new Set();
  confirmedMediaUrls: Set<string> = new Set();
  confirmedMediaList: any[] = [];
  medias: any = [];
  meta: PaginationMeta = { page: 1, limit: 20, totalPages: 1, total: 0 };
  currentVariantForImage: any = null;
  showVariantsTable: boolean = false;

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

  groupBy: string = 'Size';
  hasSku: boolean = false;
  profit: string = '';
  margin: string = '';
  totalInventory: number = 0;
  variantIdCounter: number = 0;
  @Output() mediaUrlsChanged = new EventEmitter<any[]>();
  multipleUploadService: any;
  defaultVariantOptions = ['Size', 'Color', 'Material'];
  usedOptions: Set<string> = new Set();
  variantValues: { [key: string]: string[] } = {};
  groupedVariantData: { [key: string]: any[] } = {};
  collapsedGroups: Set<string> = new Set();
  constructor(
    private route: ActivatedRoute,
    private mediaService: MediaService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.mediaService.getMedias(params).subscribe((res) => {
        this.medias = res.data;
        this.meta = res.meta;
      });
    });
  }

  updateProfitMargin() {
    const price = this.product.price;
    const cost = this.product.costPerItem;
    const profit = price - cost;
    this.profit = isNaN(profit) ? '' : `$${profit.toFixed(2)}`;

    const margin = price > 0 ? (profit / price) * 100 : 0;
    this.margin = isNaN(margin) ? '' : `${margin.toFixed(1)}%`;
  }

  toggleSkuFields() {
    if (!this.hasSku) {
      this.product.sku = '';
      this.product.barcode = '';
    }
  }

  uploadNew() {
    console.log('Upload new media logic here');
  }

  selectExisting() {
    console.log('Select existing media logic here');
  }

  addVariantOption() {
    const labels = ['Size', 'Color', 'Material'];
    const existingLabels = this.variantOptions
      .filter((opt) => opt !== null && opt.name)
      .map((opt) => opt.name);

    const nextLabel = labels.find((label) => !existingLabels.includes(label));

    if (!nextLabel) {
      alert('Only Size, Color, and Material options are allowed.');
      return;
    }

    const variantId = `variant-${Date.now()}`;
    this.variantOptions.push({ name: nextLabel, values: [''], id: variantId });
  }
  removeVariantOption(index: number) {
    this.variantOptions.splice(index, 1);
    this.variantOptions = this.variantOptions.filter(
      (opt) => opt && opt.values && opt.values.length > 0
    );
    this.generateVariants();
  }

  handleOptionValueChange(index: number, valueIndex: number, value: string) {
    this.variantOptions[index].values[valueIndex] = value;
  }

  handleValueInput(
    input: HTMLInputElement,
    containerId: string,
    optionIndex: number
  ) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isLastInput = input === container.lastElementChild;
    const isFilled = input.value.trim() !== '';

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

    const values = Array.from(container.querySelectorAll('input'))
      .map((i) => i.value.trim())
      .filter((v) => v);

    this.variantOptions[optionIndex].values = values;
  }

  generateVariants() {
    const cleanedOptions = this.variantOptions.filter(
      (opt) => opt && opt.name && opt.values && opt.values.length > 0
    );

    if (cleanedOptions.length === 0) {
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
      if (!groupKey) return; // ⬅️ prevent undefined group

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

  previewVariantImage(input: HTMLInputElement) {
    if (input.files && input.files[0]) {
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

  updateInventoryTotal() {
    const inputs = document.querySelectorAll<HTMLInputElement>(
      '#variantTable input[type="number"]:nth-child(4)'
    );
    let total = 0;
    inputs.forEach((input) => (total += Number(input.value || 0)));
    this.totalInventory = total;
  }

  submitProductForm() {
    const cleanedOptions = this.usedOptionsArray
      .filter((opt) => this.variantValues[opt]?.length)
      .map((opt) => ({
        name: opt,
        values: this.variantValues[opt].filter((val) => val.trim() !== ''),
      }));

    const combinations = this.cartesian(
      cleanedOptions.map((opt) => opt.values)
    );
    const optionNames = cleanedOptions.map((opt) => opt.name);

    const variants = combinations.map((combo, idx) => {
      const variant: any = {};

      combo.forEach((value, i) => {
        const key = optionNames[i].toLowerCase(); // 🔽 make it lowercase
        variant[key] = value;
      });

      const variantKey = combo.join('||');
      const details = this.variantDetailMap[variantKey] || {
        price: 0,
        stock: 0,
        imageVariant: '',
      };

      variant.price = details.price;
      variant.stock = details.stock;
      variant.imageVariant = details.imageVariant;
      variant.sku = `${combo.join('-')}-SKU${idx + 1}`;

      return variant;
    });

    const payload = {
      title: this.product.title,
      description: this.product.description,
      category: this.product.category,
      type: this.product.type || '',
      vendor: this.product.vendor || '',
      price: this.product.price,
      compareAtPrice: this.product.compareAtPrice,
      costPerItem: this.product.costPerItem,
      variants,
      mediaUrls: this.product.mediaUrls,
    };

    console.log('🛰️ Final Product Payload:', payload);
  }

  onMediaUrlsChanged(mediaList: any[]) {
    this.product.mediaUrls = mediaList; // ⬅ store full media object, not just URLs
  }

  openVariantMediaModal(variant: any) {
    this.currentVariantForImage = variant;
    console.log('🔍 Modal opened for variant:', variant);

    // You can integrate your media modal here and assign the selected image to `variant.image`
  }

  onModalConfirmSelection(selectedUrls: string[]) {
    const selectedUrl = selectedUrls[0];
    console.log('✅ Confirmed image URL:', selectedUrl);
    console.log(
      '📦 Current variant before update:',
      this.currentVariantForImage
    );
    if (this.currentVariantForImage && selectedUrl) {
      this.updateVariantDetail(
        this.currentVariantForImage,
        'imageVariant',
        selectedUrl
      );
      console.log('📝 Image assigned to variant');
      this.currentVariantForImage = null;
    }
  }

  onModalFileSelected(files: FileList) {
    const uploadFiles = Array.from(files);

    this.multipleUploadService.uploadFiles('multiple', uploadFiles).subscribe({
      next: (event: any) => {
        if (event?.body !== undefined) {
          for (let i = 0; i < event.body.length; i++) {
            const url = event.body[i].url;
            this.confirmedMediaUrls.add(url);
            this.selectedMediaUrls.add(url);
          }
          this.loadMediaList(); // refresh media list from server
        }
      },
      error: (err: any) => console.error('Modal upload error:', err),
    });
  }

  private loadMediaList() {
    const params = this.route.snapshot.queryParams;
    this.mediaService.getMedias(params).subscribe({
      next: (res: any) => {
        console.log(res);
        this.medias = res.data;
        this.meta = res.meta;

        // Refresh confirmedMediaList from confirmedMediaUrls
        this.confirmedMediaList = this.medias.filter((m: any) =>
          this.confirmedMediaUrls.has(m.url)
        );
      },
      error: (err) => console.error('Failed to fetch medias:', err),
    });
  }

  // Here

  variantDetailMap:
    | {
        [key: string]: {
          price: number;
          stock: number;
          imageVariant: string;
        };
      }
    | any = {};

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

  updateOptionValue(option: string, index: number, event: Event | any) {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    this.variantValues[option][index] = value;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  private cartesian(arr: string[][]): string[][] {
    return arr.reduce(
      (acc, curr) =>
        acc
          .map((x) => curr.map((y) => x.concat(y)))
          .reduce((a, b) => a.concat(b), []),
      [[]] as string[][]
    );
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
    const optionValues = cleanedOptions.map((opt) => opt.values);

    const newCombinations = this.cartesian(optionValues);

    // Preserve old combinations before rebuild
    const oldCombinations = Object.keys(this.variantDetailMap).map((k) =>
      k.split('||')
    );
    this.preserveVariantDetails(oldCombinations, newCombinations, optionNames);

    const groupBy = optionNames[0];
    const groupIndex = optionNames.indexOf(groupBy);

    const grouped: { [key: string]: any[] } = {};

    newCombinations.forEach((combo) => {
      const variantObj: { [key: string]: any } = {};
      combo.forEach((value, idx) => {
        variantObj[optionNames[idx]] = value;
      });

      const key = combo.join('||');
      Object.assign(variantObj, this.variantDetailMap[key]);

      const groupKey = combo[groupIndex];
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(variantObj);
    });

    this.showVariantsTable = this.hasValidVariants(); // only show table if valid

    this.groupedVariantData = grouped;
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
    console.log(`✅ Updated ${field} of ${key} to:`, value);
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

  preserveVariantDetails(
    oldCombinations: string[][],
    newCombinations: string[][],
    optionNames: string[]
  ) {
    const newMap: { [key: string]: any } = {};

    newCombinations.forEach((combo) => {
      const key = combo.join('||');

      // Try to find a matching combo from old combinations (ignoring new options)
      for (const old of oldCombinations) {
        let match = true;
        for (let i = 0; i < old.length; i++) {
          if (combo[i] !== old[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          const oldKey = old.join('||');
          newMap[key] = this.variantDetailMap[oldKey] || {
            price: 0,
            stock: 0,
            imageVariant: '',
          };
          return;
        }
      }

      // No match found, use default
      newMap[key] = { price: 0, stock: 0, imageVariant: '' };
    });

    this.variantDetailMap = newMap;
  }

  hasValidVariants(): boolean {
    return this.usedOptionsArray.some((opt) =>
      this.variantValues[opt]?.some((val) => val.trim() !== '')
    );
  }
}
