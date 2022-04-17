define([
    'jquery',
    'uiComponent',
    'ko',
    'mage/url',
    'mage/storage',
    'Magento_Customer/js/customer-data'
], function ($, Component, ko, urlBUilder, storage, customerData) {
    'use strict';

    function product(item, symbol) {
        item.getPrice = function () {
            return item.price;
        }
        item.symbol = symbol;
        return item;
    }

    function productList(item, symbol) {
        var self = this;
        self.symbol = symbol;
        self.product = ko.observable(product(item, symbol));
        self.qty = ko.observable(1);
        self.qtyUp = function () {
            self.qty(self.qty() + 1);
        }
        self.qtyDown = function () {
            if (self.qty() > 1) {
                self.qty(self.qty() - 1);
            }
        }
        self.sku = ko.observable(item.sku);
        self.getId = item.entity_id;
        self.total = ko.computed(function () {
            return self.qty() * self.product().getPrice();
        })
    }

    function viewModel() {
        var self = this;
        self.search = ko.observable();
        self.isSelected = ko.observable(false);
        self.productList = ko.observableArray([]);
        self.result_search = ko.observableArray([]);
        self.symbol = ko.observable();

        self.result_search_has_focus = ko.observable(true);
        self.result_search_focus = ko.observable(true);
        self.result_search_focus_listener = ko.computed(function () {
            if (self.isSelected()) {
                self.result_search_has_focus(true);
            } else {
                self.result_search_has_focus(self.result_search_focus());
            }

        })
        self.eventSearch = function () {
            var self = this;
            var serviceUrl = urlBUilder.build('fastorder/index/search');

            var result = storage.post(
                serviceUrl,
                JSON.stringify({ 'search': self.search() }),
                false
            ).done(
                function (response) {

                    var product = $.map(response.data, function (item) {
                        item.isCheck = ko.observable(self.checkExistInTable(item));
                        return item;
                    });

                    self.symbol(response.symbol);
                    if (response.data) {
                        self.result_search(product);
                    } else {
                        self.result_search([]);
                    }
                }
            )
        }
        self.checkExistInTable = function (item) {
            var exist = false;
            var idProductSearch = item.entity_id;
            ko.utils.arrayFilter(self.productList(), function (product) {
                if (product.getId == idProductSearch) {
                    exist = true;
                }
            });
            return exist;
        }

        self.check = function (item) {
            var exist = false;
            var idProductSearch = item.entity_id;
            var productExists = false;

            ko.utils.arrayFilter(self.productList(), function (product) {
                if (product.getId == idProductSearch) {
                    exist = true;
                    productExists = product;
                }
            })

            if (!exist && item.isCheck()) {
                self.productList.push(new productList(item, self.symbol()))
            } else if (exist && !item.isCheck() && productExists) {
                self.productList.remove(productExists);
            }
        }

        self.countLine = ko.computed(function () {
            if (self.productList().length) {
                return self.productList().length;
            } else {
                return 0;
            }
        })

        self.countQty = ko.computed(function () {
            var totalQty = 0;
            ko.utils.arrayFilter(self.productList(), function (product) {
                totalQty = totalQty + product.qty();
            });
            return totalQty;
        })

        self.subTotal = ko.computed(function () {
            var total = 0;
            ko.utils.arrayFilter(self.productList(), function (product) {
                total = total + product.total();
            });
            return total;
        })

        self.delete = function (item) {
            self.productList.remove(item);
            ko.utils.arrayFilter(self.result_search(), function (product) {
                if (product.entity_id == item.getId) {
                    product.isCheck(false);
                }
            });
        }

        self.addtocart = function () {
            let serviceUrl = urlBUilder.build('fastorder/index/addtocart');
            let data = [];

            ko.utils.arrayFilter(self.productList(), function (product) {
                data.push({
                    'product': product.getId,
                    'qty': product.qty(),
                });
            })

            let result = storage.post(
                serviceUrl,
                JSON.stringify(data),
                false
            ).done(
                function (response, status) {
                    if (status == 'success') {
                        alert('add cart success');
                        self.productList([]);
                        self.result_search([]);
                        self.search('');
                        customerData.reload(['cart'], true);
                        console.log(response);
                    }
                }
            ).fail(function () {
                alert('add cart fail');
            })
        }

    }

    return Component.extend(new viewModel());
})