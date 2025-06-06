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
  addOptionValue(index: number) {
    this.variantOptions[index].values.push('');
  }

  handleOptionValueChange(index: number, valueIndex: number, value: string) {
    this.variantOptions[index].values[valueIndex] = value;
  }
  trackByIndex(index: number, item: any): number {
    return index;
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

    // 👇 Determine the grouping index dynamically based on groupBy label
    const groupByIndex = cleanedOptions.findIndex(
      (opt) => opt.name === this.groupBy
    );

    // Create a normalized key from a variant combo
    const getVariantKey = (combo: string[]) =>
      combo.map((v) => v?.trim().toLowerCase() || '').join('|');

    // 🔒 Save all current variants by dynamic key
    const existingVariantsMap: { [key: string]: any } = {};
    this.variantGroups.forEach((group) => {
      group.variants.forEach((variant) => {
        const keyParts = cleanedOptions.map((opt) => {
          const prop = opt.name.toLowerCase();
          const value = variant[prop];
          return value ? value.toLowerCase() : '';
        });
        const key = keyParts.join('|');
        existingVariantsMap[key] = variant;
      });
    });

    const grouped: { [key: string]: Variant[] } = {};

    combinations.forEach((combo, idx) => {
      const key = getVariantKey(combo);

      const groupKey =
        groupByIndex >= 0 ? combo[groupByIndex] : `Group ${idx + 1}`;

      let variant: Variant;

      if (existingVariantsMap[key]) {
        // ✅ Reuse existing variant
        variant = { ...existingVariantsMap[key] };
      } else {
        // 🆕 New variant
        variant = {
          price: this.product.price,
          stock: 0,
          image: '',
          sku: `${combo.join('-')}-SKU${idx + 1}`,
        };

        cleanedOptions.forEach((opt, i) => {
          const prop = opt.name.toLowerCase();
          variant[prop] = combo[i];
        });
      }

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

  cartesian(arr: string[][]): string[][] {
    return arr.reduce(
      (a, b) =>
        a.flatMap((d) => b.map((e) => (Array.isArray(d) ? [...d, e] : [d, e]))),
      [[]] as string[][]
    );
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
    // Extract size/color/material combinations
    const cleanedOptions = this.variantOptions.filter(
      (opt) => opt && opt.name && opt.values.length
    );
    const combinations = this.cartesian(
      cleanedOptions.map((opt) => opt.values)
    );

    // Build variants
    const groupByIndex = ['Size', 'Color', 'Material'].indexOf(this.groupBy);
    const variants = combinations.map((combo, idx) => {
      const variant: any = {
        price:
          (
            document.querySelectorAll(`#variantTable input[type='number']`)[
              idx * 2
            ] as HTMLInputElement
          )?.valueAsNumber || this.product.price,
        compareAtPrice: this.product.compareAtPrice,
        costPerItem: this.product.costPerItem,
        stock:
          (
            document.querySelectorAll(`#variantTable input[type='number']`)[
              idx * 2 + 1
            ] as HTMLInputElement
          )?.valueAsNumber || 0,
        sku: `${combo.join('-')}-SKU${idx + 1}`,
        imageVariant: '',
      };
      cleanedOptions.forEach((opt, i) => {
        const key = opt.name.toLowerCase();
        variant[key] = combo[i] || '';
      });
      // Ensure missing fields are filled with empty strings
      ['size', 'color', 'material'].forEach((key) => {
        if (!variant[key]) {
          variant[key] = '';
        }
      });
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
    console.log('🛰️ Medias:', this.product.mediaUrls);

    console.log('🛰️ SUBMIT PAYLOAD TO API:', payload);
  }

  onMediaUrlsChanged(mediaList: any[]) {
    this.product.mediaUrls = mediaList; // ⬅ store full media object, not just URLs
  }

  openVariantMediaModal(variant: any) {
    this.currentVariantForImage = variant;

    // You can integrate your media modal here and assign the selected image to `variant.image`
  }

  onModalConfirmSelection(selectedUrls: string[]) {
    const selectedUrl = selectedUrls[0];
    if (this.currentVariantForImage) {
      this.currentVariantForImage.image = selectedUrl;
      this.currentVariantForImage = null; // reset
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
}
