import { Component, ElementRef, ViewChild } from '@angular/core';
import { LayoutsComponent } from '../../../components/layouts/layouts.component';
import { PageTitleComponent } from '../../../components/page-title/page-title.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { MultipleUploadComponent } from '../../../components/multiple-upload/multiple-upload.component';

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

  variantOptions: any[] = [];
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

    const optionIndex = this.variantOptions.length;
    const variantId = `variant-${Date.now()}`;

    this.variantOptions.push({ name: nextLabel, values: [], id: variantId });

    const block = document.createElement('div');
    block.className = 'mb-4 border p-3 rounded variant-option';
    block.innerHTML = `
      <label class="form-label">Option name</label>
      <input type="text" class="form-control mb-2" value="${nextLabel}" disabled />
      <label class="form-label">Option values</label>
      <div class="variant-option-values" id="${variantId}">
        <input type="text" class="form-control" placeholder="e.g., ${
          nextLabel === 'Size' ? 'M' : nextLabel === 'Color' ? 'Red' : 'Leather'
        }" />
      </div>
      <button class="btn btn-sm btn-outline-danger mt-2">Delete</button>
      <button class="btn btn-sm btn-dark mt-2">Done</button>
    `;

    const container = this.variantOptionsContainer.nativeElement;
    container.appendChild(block);

    const inputContainer = block.querySelector(`#${variantId}`);
    if (inputContainer) {
      const firstInput = inputContainer.querySelector('input');
      if (firstInput) {
        firstInput.addEventListener('input', () =>
          this.handleValueInput(
            firstInput as HTMLInputElement,
            variantId,
            optionIndex
          )
        );
      }
    }

    block
      .querySelector('.btn-outline-danger')
      ?.addEventListener('click', () => {
        block.remove();
        const indexToRemove = this.variantOptions.findIndex(
          (opt) => opt?.id === variantId
        );
        if (indexToRemove > -1) {
          this.variantOptions[indexToRemove] = null;
        }
        this.generateVariants();
      });

    block
      .querySelector('.btn-dark')
      ?.addEventListener('click', () => this.generateVariants());
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
      (opt) => opt && opt.name && opt.values.length
    );
    const combinations = this.cartesian(
      cleanedOptions.map((opt) => opt.values)
    );
    const groupByIndex = ['Size', 'Color', 'Material'].indexOf(this.groupBy);

    const grouped: { [key: string]: string[][] } = {};
    combinations.forEach((comb) => {
      const groupKey = comb[groupByIndex];
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(comb);
    });

    const table = document.getElementById('variantTable');
    if (!table) return;
    table.innerHTML = '';

    Object.entries(grouped).forEach(([group, variants], i) => {
      const groupId = `group-${i}`;
      const groupRow = document.createElement('tr');
      groupRow.className = 'variant-group';
      groupRow.innerHTML = `<td colspan="4">${group} (${variants.length} variants) ▾</td>`;
      groupRow.addEventListener('click', () => {
        const targets = document.querySelectorAll(
          `.variant-rows[data-group='${groupId}']`
        );
        groupRow.classList.toggle('collapsed');
        targets.forEach((el) => el.classList.toggle('d-none'));
      });
      table.appendChild(groupRow);

      variants.forEach((comb, idx) => {
        const label = comb
          .filter((_, idx2) => idx2 !== groupByIndex)
          .join(' / ');
        const row = document.createElement('tr');
        row.className = 'variant-rows';
        row.setAttribute('data-group', groupId);
        row.innerHTML = `
          <td>${label}</td>
          <td class="d-flex justify-content-center">
             <div class="upload-box">
              <i class="fa fa-image upload-icon"></i>
            </div>
          </td>
          <td><input type="number" class="form-control" /></td>
          <td><input type="number" class="form-control" /></td>
        `;

        row
          .querySelector('input[type="file"]')
          ?.addEventListener('change', (e: any) =>
            this.previewVariantImage(e.target)
          );
        row
          .querySelectorAll('input[type="number"]')[1]
          ?.addEventListener('input', () => this.updateInventoryTotal());

        table.appendChild(row);
      });
    });

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
}
