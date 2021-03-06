/*
 * © 2017 Stratio Big Data Inc., Sucursal en España.
 *
 * This software is licensed under the Apache License, Version 2.0.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the terms of the License for more details.
 *
 * SPDX-License-Identifier: Apache-2.0.
 */
import {
   AfterViewInit,
   ChangeDetectionStrategy,
   ChangeDetectorRef,
   Component,
   ElementRef,
   EventEmitter,
   forwardRef,
   HostListener,
   Input,
   Output,
   ViewChild,
   HostBinding,
   Injector
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import {
   has as _has,
   flatten as _flatten,
   cloneDeep as _cloneDeep
} from 'lodash';

import { StCheckValidationsDirective } from './st-check-validations';
import { StDropDownMenuGroup, StDropDownMenuItem } from '../st-dropdown-menu/st-dropdown-menu.interface';

@Component({
   selector: 'st-select',
   templateUrl: './st-select.html',
   styleUrls: ['./st-select.scss'],
   host: {
      'class': 'st-select'
   },
   changeDetection: ChangeDetectionStrategy.OnPush,
   providers: [
      { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StSelectComponent), multi: true }
   ]
})
export class StSelectComponent implements AfterViewInit, ControlValueAccessor {
   @Input() placeholder: string = '';
   @Input() name: string = '';
   @Input() label: string = '';
   @Input() tooltip: string | null = null;
   @Input() errorMessage: string | undefined = undefined;
   @Input() selected: StDropDownMenuItem = undefined;

   @Output() expand: EventEmitter<boolean> = new EventEmitter<boolean>();
   @Output() select: EventEmitter<any> = new EventEmitter<any>();

   @ViewChild('input') inputElement: ElementRef;
   @ViewChild('button') buttonElement: ElementRef;

   @HostBinding('class.st-select-opened')
   expandedMenu: boolean = false;

   onChange: (_: any) => void;
   onTouched: () => void;

   private _inputHTMLElement: HTMLInputElement | undefined = undefined;
   private _isDisabled: boolean = false;
   private _options: StDropDownMenuItem[] | StDropDownMenuGroup[] = [];

   constructor(
      private _selectElement: ElementRef,
      private _injector: Injector,
      private _cd: ChangeDetectorRef
   ) { }

   // TODO: MOVE THIS TO FORM-BASE
   notifyError(errorMessage: string): void {
      this.errorMessage = errorMessage;
   }

   /*
   ****** getters && setters ******
   */
   @Input()
   set disabled(value: boolean) {
      this._isDisabled = value;
   }

   get disabled(): boolean {
      return this._isDisabled;
   }

   @Input()
   set options(options: StDropDownMenuItem[] | StDropDownMenuGroup[]) {
      this._options = _cloneDeep(options);
      const selectedItem: StDropDownMenuItem | undefined = this.findByProperty('selected', true);
      this.removeAllSelected();
      if (selectedItem) {
         this.selected = selectedItem;
      }
   }

   get options(): StDropDownMenuItem[] | StDropDownMenuGroup[] {
      return this._options;
   }

   get selectedValue(): string {
      return this.selected && this.selected.label ? this.selected.label : '';
   }

   get disableValue(): string | null {
      return this._isDisabled === true ? '' : null;
   }

   get selectId(): string | null {
      const select: HTMLElement = this._selectElement.nativeElement;
      return select.getAttribute('id') !== null ? select.id : null;
   }

   get inputId(): string | null {
      return this.selectId !== null ? `${this.selectId}-input` : null;
   }

   get labelId(): string | null {
      return this.selectId !== null ? `${this.selectId}-label` : null;
   }

   get optionsId(): string | null {
      return this.selectId !== null ? `${this.selectId}-options` : null;
   }

   get inputName(): string | null {
      return this.name && this.name.length > 0 ? this.name : null;
   }

   get hasLabel(): boolean {
      return this.label !== undefined && this.label !== null && this.label.length > 0;
   }

   get hasError(): boolean {
      return this.errorMessage !== undefined;
   }

   /*
   ****** Control value accessor && validate methods ******
   */

   // Set the function to be called when the control receives a change event.
   registerOnChange(fn: (_: any) => void): void {
      this.onChange = fn;
   }

   // Set the function to be called when the control receives a touch event.
   registerOnTouched(fn: () => void): void {
      this.onTouched = fn;
   }

   // Write a new value to the element.
   writeValue(newValue: any): void {
      if (!this.selected || this.selected.value !== newValue) {
         this.selected = this.findByProperty('value', newValue);
         this._cd.markForCheck();
      }
   }

   setDisabledState(disabled: boolean): void {
      this._isDisabled = disabled;
      this._cd.markForCheck();
   }

   /*
   ****** Component methods ******
   */

   ngAfterViewInit(): void {
      this._inputHTMLElement = this.inputElement.nativeElement;
      const directive: StCheckValidationsDirective = this._injector.get(StCheckValidationsDirective, null);
      if (directive) {
         directive.registerOnChange(this.notifyError.bind(this));
      }
   }

   onButtonKeyPress(event: KeyboardEvent): void {
      if (event.keyCode === 13) {
         this.toggleButton();
      }
   }
   onButtonClick(): void {
      if (!this._isDisabled) {
         this.toggleButton();
         this.expandedMenu ? this._inputHTMLElement.focus() : this._inputHTMLElement.blur();
      }
   }

   @HostListener('document:click', ['$event'])
   onClickOutside(event: Event): void {
      const expandNewValue: boolean = this.expandedMenu && this.buttonElement.nativeElement.contains(event.target);
      if (expandNewValue !== this.expandedMenu) {
         this.expandedMenu = expandNewValue;
         this.expand.emit(this.expandedMenu); // Notify expand change
      }
   }

   onChangeOption(option: StDropDownMenuItem): void {
      this.selected = option && option.value !== undefined ? option : undefined;
      const value: any = option && option.value !== undefined ? option.value : undefined;
      if (this.onChange) {
         this.onChange(value);
      }
      if (this.onTouched) {
         this.onTouched();
      }
      this.select.emit(value);
      this._cd.markForCheck();
   }

   /*
   ****** Util component methods ******
   */

   // Search element by property in option list
   private findByProperty(propName: 'value' | 'selected', propValue: any): StDropDownMenuItem | undefined {
      if (this.isStDropdownItemList(this.options)) {
         return this.options.find(item => _has(item, propName) && item[propName] === propValue);
      } else if (this.isStDropdownGroupList(this.options)) {
         return _flatten(this.options.map(group => group.items)).find(item => _has(item, propName) && item[propName] === propValue);
      }
   }

   // Check if options are a instance of StDropDownMenuItem[]
   private isStDropdownItemList(items: StDropDownMenuItem[] | StDropDownMenuGroup[]): items is StDropDownMenuItem[] {
      return this.options && this.options.length > 0 && !_has((items as StDropDownMenuGroup[])[0], 'items');
   }

   // Check if options are a instance of StDropDownMenuGroup[]
   private isStDropdownGroupList(items: StDropDownMenuItem[] | StDropDownMenuGroup[]): items is StDropDownMenuGroup[] {
      return this.options && this.options.length > 0 && _has((items as StDropDownMenuGroup[])[0], 'items');
   }

   private toggleButton(): void {
      this.expandedMenu = !this.expandedMenu;
      this.expand.emit(this.expandedMenu); // Notify expand change
      this._cd.markForCheck();
   }

   // TODO: Remove when remove from StDropDownMenuItem model the selected property
   private removeAllSelected(): void {
      if (this.isStDropdownItemList(this.options)) {
         return this.options.forEach(item => {
            if (item.selected) {
               delete item.selected;
            }
         });
      } else if (this.isStDropdownGroupList(this.options)) {
         this.options.forEach(group => group.items.forEach(item => {
            if (item.selected) {
               delete item.selected;
            }
         }));
      }
   }
}
