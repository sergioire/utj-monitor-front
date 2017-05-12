define(
        [
            'knockout', 'ojs/ojcore', 'jquery',
            'view-models/GeneralViewModel',
            'view-models/events/EventTypes',
            'utils/IdGenerator',
            'ojs/ojknockout',
            'ojs/ojcollapsible', 'ojs/ojinputtext',
            'ojs/ojtable', 'ojs/ojarraytabledatasource'
        ],
        function (ko, oj, $, GeneralViewModel, EventTypes, IdGenerator) {
            var theKey = {};
            
            function EditableTable(data, model, params) {
                var self = this;
                
                self.listeners = [];
                
                var privateData = {
                    model: model,
                    data: [],
                    type: null,
                    ENABLED: 1.0,
                    DISABLED: 0.5,
                    newValidator: function() {return true;},
                    deleteValidator: function() {return false;},
                    itemCreator: function() {return {};},
                    itemRemover: function() {return false;}
                };
                
                this.EditableTable_ = function(key) {
                    if (theKey === key) {
                        return privateData;
                    }
                };
                
                self.id = params.id || Math.random();
                self.collapsibleId = self.id + "-collapsible";
                self.titleId = self.id + "-title";
                self.deleteErrorDialogId = self.id + "-deleteErrorDialog";
                self.title = "Title";
                self.newHint = self.nls("templates.editableTable.newHint");
                self.summaryTable = "";
                self.ariaTable = "";
                self.rowTemplateId = self.id + "-rowTemplate";
                self.editRowTemplateId = self.id + "-editRowTemplate";
                self.columns = [{headerText: 'Column Header'}];
                self.state = ko.observable(privateData.ENABLE);
                self.showNewError = ko.observable(false);
                self.newErrorText = "Error";
                self.deleteErrorText = "Error";
                self.deleteErrorDialogOkButtonLabel = self.nls("templates.editableTable.deleteErrorDialog.okButtonLabel");
                self.deleteErrorDialogTitle = self.nls("templates.editableTable.deleteErrorDialog.title");
                self.currentRow = ko.observable();
                
                var dataSource = new oj.ArrayTableDataSource([]);
                self.observableDataSource = ko.observable(dataSource);
                        
                if (params) {
                    self.title = params.title ? params.title : "Title";
                    self.columns = params.columns || [{headerText: 'Column Header'}];
                    self.tableSummary = params.tableSummary ? params.tableSummary : "";
                    self.tableAria = params.tableAria ? params.tableAria : "";
                    self.newErrorText = params.newErrorText ? params.newErrorText : "Error";
                    self.deleteErrorText = params.deleteErrorText ? params.deleteErrorText : "Error";
                    self.setNewValidator(params.newValidator);
                    self.setDeleteValidator(params.deleteValidator);
                    self.setItemCreator(params.itemCreator);
                    self.setItemRemover(params.itemRemover);
                    self.setNewEnabled(params.newEnabled !== undefined ? params.newEnabled : true);
                    
                    privateData.type = params.type;
                }
                
                if (data) {
                    this.setData(data, theKey);
                    dataSource = new oj.ArrayTableDataSource(
                            this.getData(),
                            {idAttribute: "id"}
                    );
            
                    self.observableDataSource(dataSource);
                }

                self.getRowTemplate = function (data, context) {
                    var mode = context.$rowContext['mode'];
                    return mode === 'edit' ? self.editRowTemplateId : self.rowTemplateId;
                };

                self.newClickHandler = function () {
                    if (self.validateOnNew(theKey)) {
                        var itemIds = Object.keys(self.getModel().getItems());
                        var id = IdGenerator.getNewIntegerId(itemIds, itemIds.length * 2);
                        
                        var newItem = self.createItem(id, theKey);
                        self.observableDataSource().add(newItem);
                    } else {
                        self.showNewError(true);
                    }
                };

                self.deleteHandler = function () {
                    var currentRow = self.getCurrentRow();
                    console.debug("currentRow: %o", currentRow);

                    if (self.validateOnDelete(currentRow.rowKey, theKey)) {
                        self.removeItem(currentRow.rowKey, theKey);
                        self.observableDataSource().remove({id: currentRow.rowKey});
                    } else {
                        $("#" + self.deleteErrorDialogId).ojDialog("open");
                    }
                };
                
                self.filterHandler = function(event, ui) {
                    var currentRow = self.getCurrentRow();
                    
                    self.callListeners(EventTypes.FILTER_EVENT, currentRow.rowKey);
                };
                
                self.currentRowHandler = function(event, ui) {
                    self.currentRow(ui.currentRow);
                };
                
                self.computedColor = function(id, data) {
//                    console.trace("data: %o", data);
                    return ko.pureComputed(
                                function() {
                                    if (self.currentRow()) {
                                        var currentRowKey = self.currentRow().rowKey;
                                        return currentRowKey === id ? "lightgray" : "";
                                    }
                                }
                            );
                };
                
                self.closeErrorDialog = function() {
                    $("#" + self.deleteErrorDialogId).ojDialog("close");
                };
            }
            
            EditableTable.prototype = Object.create(GeneralViewModel);
            
            var prototype = EditableTable.prototype;
            
            prototype.filter = function(itemsToKeep) {
                this.observableDataSource().reset(itemsToKeep);
                
                var idsToKeep = itemsToKeep.map(
                            function(item) {
                                return item.id;
                            }
                        );
                this.callListeners(EventTypes.FILTER_EVENT, idsToKeep);
            };
            
            prototype.removeItem = function(id, key) {
                if (theKey === key) {
                    var remover = this.getItemRemover();
                    return remover(id);
                }
            };
            
            prototype.getItemRemover = function() {
                return this.EditableTable_(theKey).itemRemover;
            };
            
            prototype.setItemRemover = function(itemRemover) {
                if (typeof itemRemover === 'function') {
                    this.EditableTable_(theKey).itemRemover = itemRemover;
                }
            };
            
            prototype.createItem = function(id, key) {
                if (theKey === key) {
                    var creator = this.getItemCreator();
                    return creator(id);
                }
            };
            
            prototype.getItemCreator = function() {
                return this.EditableTable_(theKey).itemCreator;
            };
            
            prototype.setItemCreator = function(itemCreator) {
                if (typeof itemCreator === 'function') {
                    this.EditableTable_(theKey).itemCreator = itemCreator;
                }
            };
            
            prototype.validateOnDelete = function(item, key) {
                if (theKey === key) {
                    var validator = this.getDeleteValidator();
                    return validator(id);
                }
                
                return false;
            };
            
            prototype.validateOnNew = function(key) {
                if (theKey === key) {
                    var validator = this.getNewValidator();
                    return validator();
                }
                
                return false;
            };
            
            prototype.getNewValidator = function() {
                return this.EditableTable_(theKey).newValidator;
            };
            
            prototype.setNewValidator = function(newValidator) {
                if (typeof newValidator === 'function') {
                    this.EditableTable_(theKey).newValidator = newValidator;
                }
            };
            
            prototype.validateOnDelete = function(item, key) {
                if (theKey === key) {
                    var validator = this.getDeleteValidator();
                    return validator(item);
                }
                
                return false;
            };
            
            prototype.getDeleteValidator = function() {
                return this.EditableTable_(theKey).deleteValidator;
            };
            
            prototype.setDeleteValidator = function(deleteValidator) {
                if (typeof deleteValidator === 'function') {
                    this.EditableTable_(theKey).deleteValidator = deleteValidator;
                }
            };
            
            prototype.setNewEnabled = function(state) {
                var privateData = this.EditableTable_(theKey);
                
                if(state) {
                    this.showNewError(false);
                }
                
                this.state(state ? privateData.ENABLED : privateData.DISABLED) ;
            };
            
            prototype.getNewEnabled = function() {
                return this.state();
            };
            
            prototype.addFilterListener = function(listener) {
                this.addListener(listener, EventTypes.FILTER_EVENT);
            };
            
            prototype.addDataListener = function(listener) {
                this.addListener(listener, EventTypes.DATA_EVENT);
            };
            
            prototype.getData = function() {
                return this.EditableTable_(theKey).data;
            };
            
            prototype.setData = function(data, key) {
                var privateData = this.EditableTable_(key);
                
                if (privateData) {
                    privateData.data = data;
                }
            };
            
            prototype.getType = function() {
                return this.EditableTable_(theKey).type;
            };
            
            prototype.getModel = function() {
                return this.EditableTable_(theKey).model;
            };
            
            prototype.setModel = function(model) {
                this.EditableTable_(theKey).model = model;
            };
            
            prototype.refresh = function() {
                $("#" + this.id).ojTable("refresh");
            };
            
            prototype.getCurrentRow = function() {
                return $("#" + this.id).ojTable("option", "currentRow");
            };
            
            return EditableTable;
        }
);