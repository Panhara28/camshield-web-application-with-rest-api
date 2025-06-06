import { Component, ElementRef, ViewChild } from '@angular/core';
import { LayoutsComponent } from '../../../components/layouts/layouts.component';
import { PageTitleComponent } from '../../../components/page-title/page-title.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { MultipleUploadComponent } from '../../../components/multiple-upload/multiple-upload.component';
import { Variant } from '../../../models/variant.model';

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
    console.log('🖼️ Open modal to select media for variant:', variant);
    // You can integrate your media modal here and assign the selected image to `variant.image`
  }
}
