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
import { ActivatedRoute, Router } from '@angular/router';
import { MediaService } from '../../../services/medias.service';
import { CreateProductService } from '../../../services/create-product.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoryService } from '../../../services/categories-service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ProductDetialService } from '../../../services/product-detail';
import { UpdateProductSerivce } from '../../../services/update-product.service';

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
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './edit-product.component.html',
  styleUrl: './edit-product.component.css',
})
export class EditProductComponent {
  @Output() mediaUrlsChanged = new EventEmitter<any[]>();
  totalInventory: number | any = 0;
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
  meta: any = {};
  profit: string = '';
  margin: string = '';

  constructor(
    private route: ActivatedRoute,
    private mediaService: MediaService,
    private productDetailService: ProductDetialService,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService,
    private router: Router,
    private updateProductService: UpdateProductSerivce
  ) {}

  ngOnInit() {
    this.fetchCategories();
    this.route.params.subscribe((params) => {
      const slug = params['id'];
      if (slug) {
        this.productDetailService.getProductDetailBySlug(slug).subscribe({
          next: (res: any) => {
            this.product = { ...res, id: res.id }; // ✅ Ensure product.id exists
            this.updateProfitMargin();
          },
          error: (err: any) => console.error('Failed to load product:', err),
        });
      }
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

  onMediaUrlsChanged(mediaList: any[]): void {
    this.product.mediaUrls = [...mediaList];
    this.product.MediaProductDetails = [...mediaList];
  }

  submitProductForm(): void {
    const { MediaProductDetails, ...productWithoutMediaDetails } = this.product;

    const payload = {
      ...productWithoutMediaDetails,
      MediaProductDetails: this.product.mediaUrls || [],
      type: this.product.type || '',
    };

    this.updateProductService
      .updateProduct(this.product.slug, payload)
      .subscribe({
        next: () => {
          this.snackBar.open('✅ Product updated successfully!', 'Close', {
            duration: 3000,
            panelClass: ['snack-success'],
          });
          this.router.navigate([`/products/${this.product.slug}/edit`]);
        },
        error: () =>
          this.snackBar.open(
            '❌ Failed to update product. Please try again.',
            'Close',
            {
              duration: 3000,
              panelClass: ['snack-error'],
            }
          ),
      });
  }
}
