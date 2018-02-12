define(
    [
        'ojs/ojcore',
        'jquery',
        'knockout',
        'view-models/GeneralViewModel',
        'data/RESTConfig',
        'data/AjaxUtils',
        'data/DataProvider',
        'modules/admin/strategic/model/StrategicModel',
        'modules/admin/strategic/model/StrategicTypes',
        'modules/admin/strategic/model/StrategicDataParser',
        'modules/admin/indicators/model/FullIndicator',
        'modules/admin/indicators/model/ComponentItem',
        'ojs/ojknockout',
        'ojs/ojradioset',
        'ojs/ojswitch',
        'ojs/ojcollapsible',
        'ojs/ojinputtext',
        'ojs/ojselectcombobox',
        'ojs/ojdatetimepicker',
        'ojs/ojinputnumber',
        'ojs/ojchart',
        'ojs/ojtable',
        'ojs/ojarraytabledatasource',
        'promise'
    ], 
    function (oj, $, ko, GeneralViewModel, RESTConfig, AjaxUtils, DataProvider,
            StrategicModel, StrategicTypes, StrategicDataParser,
            FullIndicator,
            ComponentItem) {
        /**
         * Indicators Form ViewModel.
         */
        function FormViewModel(params) {
        var self = this;

        // Date converter
        var dateOptions = { formatStyle: 'date', pattern: 'dd/MM/yyyy' };
        self.dateConverter = oj.Validation.converterFactory("datetime").createConverter(dateOptions);

        // Sections enabled
        self.generalEnable = ko.observable(false);
        self.responsibleEnable = ko.observable(false);
        self.metadataEnable = ko.observable(false);

        /*
         * Main section.
         */
        // Type option
        self.typeLabel = GeneralViewModel.nls("admin.indicators.form.sections.main.type");
        self.typeValue = ko.observable('1');

        /**
         * Type change event.
         *
         * This function is triggered after selecting an option in
         * type's radioset.
         *
         * @param {*} event
         * @param {*} data
         */
        self.typeChange = function (event, data) {
            switch (data.value) {
                case "PIDE":
                    self.generalEnable(false);
                    self.responsibleEnable(false);
                    self.metadataEnable(false);
                    break;

                case "MECASUT":
                    self.generalEnable(false);
                    self.responsibleEnable(true);
                    self.metadataEnable(false);
                    break;

                case "Programa Educativo":
                    self.generalEnable(true);
                    self.responsibleEnable(true);
                    self.metadataEnable(true);
                    break;
            }
        };

        // Active/Inactive option
        self.activeLabel = GeneralViewModel.nls("admin.indicators.form.sections.main.active");
        self.activeValue = ko.observable(true);
        self.switchToList = function() {
            params.switchFunction();
        };
        
        self.saveMessage = ko.observable();
        self.saveDialogId = "indicator-form-save-dialog";
        self.saveDialogTitle = GeneralViewModel.nls("admin.strategic.saveDialog.title");
        let saveDialogClass;
        
        function populateIndicator(indicator) {
            indicator.setType({id: parseInt(self.typeValue())});
            indicator.setStatus({id: self.activeValue() ? 1 : 2});
            indicator.setDescription(self.descriptionValue());
            indicator.setDirection(self.directionValue()[0]);
            indicator.setPeriodicity({id: parseInt(self.periodicityValue()[0])});
            indicator.setUnitMeasure({id: parseInt(self.measureUnitValue()[0])});
            indicator.setResetType({id: parseInt(self.resetValue()[0])});
            indicator.setBaseYear(self.baseYearValue());
        }
        
        self.saveForm = function() {
            let indicator = new FullIndicator(-1, self.nameValue());
            populateIndicator(indicator);
            
            let path = RESTConfig.admin.indicators.pide.items.path;
            let method = indicator.getId() !== -1 ? "PUT" : "POST";
            
            function successFunction (data) {
                self.saveMessage(GeneralViewModel.nls("admin.strategic.saveDialog.success"));
                saveDialogClass = "save-dialog-success";
                
                if (data) {
                    indicator.setId(data.id);
                }
            }

            function errorFunction(jqXHR, textStatus, errMsg) {
                self.saveMessage(GeneralViewModel.nls("admin.strategic.saveDialog.success") + errMsg);
                saveDialogClass = "save-dialog-error";
            }
            let savePromise = AjaxUtils.ajax(path, method, indicator, successFunction, errorFunction);
            
            savePromise.then(
                function() {
                    self.showDialog();
                }
            );
        };
        
        self.showDialog = function() {
            var saveDialog = $("#" + self.saveDialogId);
            saveDialog.ojDialog("widget").addClass(saveDialogClass);
            saveDialog.ojDialog("open");
        };
        /*
         * General section.
         */
        self.generalTitle = GeneralViewModel.nls("admin.indicators.form.sections.general.title");

        // Update option
        self.updateLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.update");
        self.updateValue = ko.observable('Manual');

        // PE Axes option
        self.peAxesLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.axes");
        self.peAxesValue = ko.observable("");
        self.peAxesOptions = ko.observableArray([]);

        // PE Topics option
        self.peTopicsLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.topics");
        self.peTopicsValue = ko.observable("");
        self.peTopicsOptions = ko.observableArray([]);

        // PE Objectives option
        self.peObjectivesLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.objectives");
        self.peObjectivesValue = ko.observable("");
        self.peObjectivesOptions = ko.observableArray([]);

        // PE Indicators option
        self.peIndicatorsLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.indicators");
        self.peIndicatorsValue = ko.observable("");
        self.peIndicatorsOptions = ko.observableArray([]);

        /**
         * PE Axes change event.
         *
         * Triggered after changing the PE Axes combobox.
         *
         * @param {*} event
         * @param {*} data
         */
        self.peAxesChange = function (event, data) {
            // If the new value is not empty
            if (data.value !== "") {
                // Set new topic options
                self.peTopicsOptions(self.getTopics(data.value));
            }
        };

        /**
         * PE Topics change event.
         *
         * Triggered after changing the PE Topics combobox.
         *
         * @param {*} event
         * @param {*} data
         */
        self.peTopicsChange = function (event, data) {
            // If the new value is not empty
            if (data.value !== "") {
                // IF the axes value has changed / the change option is triggered because the options has changed.
                if (data.option === "options") {
                    // Set new objective options
                    self.peObjectivesOptions(self.getObjectives(self.peAxesValue(), data.value[0].value));
                } else {
                    // Set new objective options
                    self.peObjectivesOptions(self.getObjectives(self.peAxesValue(), data.value));
                }
            }
        };

        /**
         * PE Objectives change event.
         *
         * Triggered after changing the PE Objectives combobox.
         *
         * @param {*} event
         * @param {*} data
         */
        self.peObjectivesChange = function (event, data) {
            // If the new value is not empty
            if (data.value !== "") {
                // IF the topics value has changed / the change option is triggered because the options has changed.
                if (data.option === "options") {
                    // Set new indicators options
                    self.peIndicatorsOptions(self.getIndicators(self.peAxesValue(), self.peTopicsValue(), data.value[0].value));
                } else {
                    // Set new indicators options
                    self.peIndicatorsOptions(self.getIndicators(self.peAxesValue(), self.peTopicsValue(), data.value));
                }
            }
        };

        // Name field
        self.nameLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.name.label");
        self.namePlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.general.name.placeholder");
        self.nameValue = ko.observable("");

        // Description field
        self.descriptionLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.description.label");
        self.descriptionPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.general.description.placeholder");
        self.descriptionValue = ko.observable("");

        // Class field
        self.classLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.class");
        self.classValue = ko.observable("");

        // PE field
        self.peLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.pe.label");
        self.pePlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.general.pe.placeholder");
        self.peValue = ko.observable("");

        // Short name field
        self.shortNameLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.shortName.label");
        self.shortNamePlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.general.shortName.placeholder");
        self.shortNameValue = ko.observable("");

        // Direction option
        self.directionLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.direction");
        self.directionOptions = ko.observableArray(
                [
                    { value: 'POSITIVE', label: 'Positivo' },
                    { value: 'NEGATIVE', label: 'Negativo' }
                ]
        );
        self.directionValue = ko.observable('POSITIVE');

        // Unit of measurement field
        self.measureUnitLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.measure.label");
        self.measureUnitOptions = ko.observableArray(
                [
                    { value: '1', label: 'Numérico' },
                    { value: '2', label: 'Porcentaje' },
                    { value: '3', label: 'Ordinal' },
                    { value: '4', label: 'Promedio' },
                    { value: '5', label: 'Moneda' },
                    { value: '6', label: 'Tiempo' }
                ]
        );

        self.measureUnitValue = ko.observable('1');

        // Base year field
        self.baseYearLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.baseYear.label");
        self.baseYearPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.general.baseYear.placeholder");
        self.baseYearValue = ko.observable("");

        // Periodicity option
        self.periodicityLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.periodicity");
        self.periodicityOptions = ko.observableArray([
            { value: '1', label: 'Mensual' },
            { value: '2', label: 'Trimestral' },
            { value: '3', label: 'Cuatrimestral' },
            { value: '4', label: 'Semestral' },
            { value: '5', label: 'Anual' }
        ]);
        self.periodicityValue = ko.observable('1');

        // Reset option
        self.resetLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.reset");
        self.resetOptions = ko.observableArray([
            { value: '1', label: 'Continuo' },
            { value: '2', label: 'Cuatrimestral' },
            { value: '3', label: 'Anual' }
        ]);
        self.resetValue = ko.observable('1');

        // Reset date field
        self.resetDateLabel = GeneralViewModel.nls("admin.indicators.form.sections.general.resetDates");
        self.resetDateValue1 = ko.observable(oj.IntlConverterUtils.dateToLocalIso(new Date()));
        self.resetDateValue2 = ko.observable(oj.IntlConverterUtils.dateToLocalIso(new Date()));
        self.resetDateValue3 = ko.observable(oj.IntlConverterUtils.dateToLocalIso(new Date()));

        /*
         * Alignment section
         */
        self.alignmentTitle = GeneralViewModel.nls("admin.indicators.form.sections.alignment.title");

        // PIDE table
        self.pideTableLabel = GeneralViewModel.nls("admin.indicators.form.sections.alignment.pide.title");
        self.pideId = Math.floor(Math.random() * 100) + 1;
        self.pideColumns = [
            {
                "headerText": "Eje",
                "headerStyle": 'max-width: 5em;',
                "style": 'min-width: 30%; max-width: 20em; width: 30%;',
                "sortable": "auto"
            },
            {
                "headerText": "Tema",
                "headerStyle": 'max-width: 5em;',
                "style": 'min-width: 30%; max-width: 20em; width: 30%;',
                "sortable": "auto"
            },
            {
                "headerText": "Objetivo",
                "headerStyle": 'max-width: 5em;',
                "style": 'min-width: 30%; max-width: 20em; width: 30%;',
                "sortable": "auto"
            },
            {
                "headerText": 'Acciones',
                "headerStyle": 'max-width: 5em;',
                "style": 'min-width: 10%; width: 10%;',
                "sortable": "disabled"
            }
        ];
        self.pideObservableArray = ko.observableArray([]);
        self.pideDataSource = new oj.ArrayTableDataSource(self.pideObservableArray, { idAttribute: 'id' });

        // Row template for PIDE table
        self.getPIDERowTemplate = function (data, context) {
            let mode = context.$rowContext['mode'];
            let templateName = mode === 'edit' || data.isNew ? 'pideEditRowTemplate' : 'pideRowTemplate';
            
            data.isNew = false;
            
            return templateName;
        };
        
        let sortByName = (a, b) => a.name.localeCompare(b.name);
        
        //PIDE Filter select controls population
        let strategicDataProvider =
                        new DataProvider(
                                RESTConfig.admin.strategic.items.path,
                                StrategicDataParser);

        let strategicPromise = strategicDataProvider.fetchData();
        let strategicModel;
        self.axesOptions = ko.observableArray();
        self.topicsOptionsByRow = ko.observable({});
        self.objectivesOptionsByRow = ko.observable({});
        
        strategicPromise.then(
            () =>  {
                strategicModel = new StrategicModel(strategicDataProvider);
                self.axesOptions(
                        strategicModel
                        .getItemsByType(StrategicTypes.AXE)
                        .sort(sortByName)
                        .map(
                            (axe) => { 
                                return {value: axe.id, label: axe.name}; 
                            }
                        )
                );
            }
        );

        /**
         * Filter search.
         * 
         * This functions validates a value based in Oracle JET's option value.
         * Oracle JET returns an object value (array), so this function validates
         * if is an array and returns the first index, otherwise returns the value.
         * 
         * @param {*} search 
         */
        function filterSearch(search) {
            return typeof search === 'object' ? search[0] : search;
        }

        /**
         * Get axes options.
         * @returns {array}
         */
        self.getAxes = function () {
            // Get all axes.
            let axes = self.strategicArray.map(function (axe) {
                return { value: axe.name, label: axe.name };
            });

            return axes;
        };

        /**
         * Get Topic array.
         * @param {string} search
         * @returns {array}
         */
        self.getTopics = function (search) {
            // In case the value comes in [] or {} format
            search = filterSearch(search);

            // Get first coincidence of the searched axe.
            let searchAxe = self.strategicArray.filter(function (axe) {
                return axe.name === search;
            })[0];

            // Get all topics from the searched axe.
            let topics = searchAxe.children.map(function (topic) {
                return { value: topic.name, label: topic.name };
            });

            return topics;
        };

        /**
         * Get Objectives array.
         * @param {any} searchAxe
         * @param {any} searchTopic
         */
        self.getObjectives = function (searchAxe, searchTopic) {
            // In case the value comes in [] or {} format
            searchAxe = filterSearch(searchAxe);
            searchTopic = filterSearch(searchTopic);

            // Get first coincidence of the searched axe.
            let axeArray = self.strategicArray.filter(function (axe) {
                return axe.name === searchAxe;
            })[0];

            // Get first coincidence of the searched topic.
            let topicArray = axeArray.children.filter(function (topic) {
                return topic.name === searchTopic;
            })[0];

            // Get all objectives from the searched topic.
            let objectives = topicArray.children.map(function (topic) {
                return { value: topic.name, label: topic.name };
            });

            return objectives;
        };

        /**
         * Get Indicators array.
         *
         * Get Indicators data in a search based in the selected axe, topic and objective.
         *
         * @param {*} searchAxe
         * @param {*} searchTopic
         * @param {*} searchObjective
         */
        self.getIndicators = function (searchAxe, searchTopic, searchObjective) {
            // In case the search type came in object/array format
            searchAxe = filterSearch(searchAxe);
            searchTopic = filterSearch(searchTopic);
            searchObjective = filterSearch(searchObjective);

            // Get first coincidence of the searched axe.
            let axeArray = self.strategicArray.filter(function (axe) {
                return axe.name === searchAxe;
            })[0];

            // Get first coincidence of the searched topic.
            let topicArray = axeArray.children.filter(function (topic) {
                return topic.name === searchTopic;
            })[0];

            // Get first coincidence of the searched objective.
            let objectivesArray = topicArray.children.filter(function (objective) {
                return objective.name === searchObjective;
            })[0];

            // Get all indicators from the searched objective.
            let indicators = objectivesArray.children.map(function (indicator) {
                return { value: indicator.name, label: indicator.name };
            });

            return indicators;
        };

        /**
         * Axes change event.
         *
         * Triggered after changing an axe in PIDE table.
         *
         * @param {type} id Row's ID.
         * @param {type} axe Axe value.
         */
        self.axesChange = function (id, axeId) {
            // Set new topic options
            axeId = axeId()[0];
            
            if (axeId) {
                let topics = strategicModel.getItemsByTypeByParent(StrategicTypes.TOPIC, [strategicModel.getItemById(axeId)]);
                let options = self.topicsOptionsByRow();
                topics = topics.map(
                    (topic) => {
                        return {value: topic.id, label: topic.name};
                    }
                );
        
                options[id](topics);
            }
        };

        /**
         * Topics change event.
         *
         * Triggered after changing a topic in PIDE table.
         *
         * @param {type} id
         * @param {type} axe
         * @param {type} topic
         */
        self.topicsChange = function (id, topicId) {
            topicId = topicId()[0];
            
            if (topicId) {
                let objectives = strategicModel.getItemsByTypeByParent(StrategicTypes.OBJECTIVE, [strategicModel.getItemById(topicId)]);
                let options = self.objectivesOptionsByRow();
                objectives = objectives.map(
                    (objective) => {
                        return {value: objective.id, label: objective.name};
                    }
                );
        
                options[id](objectives);
            }
        };

        /**
         * Add row to PIDE's table
         */
        self.pideAddRow = function () {
            // New row
            var row = {
                'id': self.pideId++,
                'axe': ko.observable(''),
                'topic': ko.observable(''),
                'objective': ko.observable(''),
                'isNew': true
            };

            // Add row to PIDE table
            self.pideObservableArray.push(row);
            // Add new map to Topics Options
            let topics = self.topicsOptionsByRow();            
            topics[row.id] = ko.observableArray();
            self.topicsOptionsByRow(topics);
            
            let objectives = self.objectivesOptionsByRow();            
            objectives[row.id] = ko.observableArray();
            self.objectivesOptionsByRow(objectives);
        };

        /**
         * Clone PIDE's table row.
         * @param {ko.Observable} Axe
         * @param {ko.Observable} Topic
         * @param {ko.Observable} Objective
         */
        self.pideCloneRow = function (Axe, Topic, Objective) {
            // New row
            var row = {
                'id': self.pideId++,
                'axe': ko.observable(Axe()),
                'topic': ko.observable(Topic()),
                'objective': ko.observable(Objective())
            };

            // Add row to PIDE table
            self.pideObservableArray.push(row);

            // Add new map to Topics Option
            self.topicsOptions.push({
                id: row.Id,
                options: ko.observableArray(self.getTopics(row.Axe()))
            });

            // Add new map to Objective options
            self.objectivesOptions.push({
                id: row.Id,
                options: ko.observableArray(self.getObjectives(row.Axe(), row.Topic()))
            });
        };

        /**
         * Remove PIDE's table row.
         * @param {number} id
         */
        //TODO: Update this function according to new variables
        self.pideRemoveRow = function (id) {
            // Remove row from table
            self.pideObservableArray.remove(function (item) {
                return item.Id === id;
            });

            // Remove row from topics options
            self.topicsOptions.remove(function (item) {
                return item.Id === id;
            });

            // Remove row from objectives options
            self.objectivesOptions.remove(function (item) {
                return item.Id === id;
            });
        };

        // POA section
        self.poaSectionLabel = GeneralViewModel.nls("admin.indicators.form.sections.alignment.poa.title");

        // Process table
        self.processTableLabel = GeneralViewModel.nls("admin.indicators.form.sections.alignment.poa.process.title");
        self.processId = Math.floor(Math.random() * 100) + 1;
        self.processColumns = [
            { "headerText": "Procesos", "sortable": "auto" }
        ];
        self.processObservableArray = ko.observableArray([]);
        self.processDataSource = new oj.ArrayTableDataSource(self.processObservableArray, { idAttribute: 'Id' });

        // Projects table
        self.projectsTableLabel = GeneralViewModel.nls("admin.indicators.form.sections.alignment.poa.projects.title");
        self.projectsId = Math.floor(Math.random() * 100) + 1;
        self.projectsColumns = [
            { "headerText": "Proyectos", "sortable": "auto" }
        ];
        self.projectsObservableArray = ko.observableArray([]);
        self.projectsDataSource = new oj.ArrayTableDataSource(self.projectsObservableArray, { idAttribute: 'Id' });

        // Get data
        $.getJSON("data/pide-alignment.json")
            .done(function (data) {
                // PIDE data
                let pide = data.alignment.pide;

                // POA data
                let poa = data.alignment.poa;

                // Fill Process Table
                $.each(poa.process, function (key, value) {
                    self.processObservableArray.push({
                        'Id': self.processId++,
                        'Process': value.process
                    });
                });

                // Fill Projects Table
                $.each(poa.projects, function (key, value) {
                    self.projectsObservableArray.push({
                        'Id': self.projectsId++,
                        'Project': value.project
                    });
                });
            });

        /*
         * Responsible section
         */
        self.responsibleTitle = GeneralViewModel.nls("admin.indicators.form.sections.responsible.title");

        // Secretary option
        self.secretaryLabel = GeneralViewModel.nls("admin.indicators.form.sections.responsible.secretary");
        self.secretaryOptions = ko.observableArray([
            { value: 'Académica', label: 'Académica' },
            { value: 'Administrativa', label: 'Administrativa' },
            { value: 'Vinculación', label: 'Vinculación' },
            { value: 'Rectoría', label: 'Rectoría' }
        ]);
        self.secretaryValue = ko.observable('Administrativa');

        // Address option
        self.addressLabel = GeneralViewModel.nls("admin.indicators.form.sections.responsible.address");
        self.addressValue = ko.observable("Dirección 1");

        // Department head option
        self.departmentHeadLabel = GeneralViewModel.nls("admin.indicators.form.sections.responsible.departmentHead");
        self.departmentHeadValue = ko.observable('Jefe de departamento');

        // Responsible option
        self.responsibleLabel = GeneralViewModel.nls("admin.indicators.form.sections.responsible.responsible");
        self.responsibleValue = ko.observable('Persona responsable de la información');

        // Responsible charge field
        self.responsibleChargeLabel = GeneralViewModel.nls("admin.indicators.form.sections.responsible.responsibleCharge.label");
        self.responsibleChargePlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.responsible.responsibleCharge.placeholder");
        self.responsibleChargeValue = ko.observable("");

        // Email field
        self.emailLabel = GeneralViewModel.nls("admin.indicators.form.sections.responsible.email.label");
        self.emailPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.responsible.email.placeholder");
        self.emailValue = ko.observable("");

        // Phone field
        self.phoneLabel = GeneralViewModel.nls("admin.indicators.form.sections.responsible.phone.label");
        self.phonePlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.responsible.phone.placeholder");
        self.phoneValue = ko.observable("");

        // Extension field
        self.extensionLabel = GeneralViewModel.nls("admin.indicators.form.sections.responsible.extension.label");
        self.extensionPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.responsible.extension.placeholder");
        self.extensionValue = ko.observable("");

        // Observations field
        self.observationsRLabel = GeneralViewModel.nls("admin.indicators.form.sections.responsible.observations");
        self.observationsRValue = ko.observable("");

        /*
         * Metadata section
         */
        self.metadataTitle = GeneralViewModel.nls("admin.indicators.form.sections.metadata.title");

        // Source field
        self.sourceLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.source.label");
        self.sourcePlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.metadata.source.placeholder");
        self.sourceValue = ko.observable("");

        // Link field
        self.linkLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.link.label");
        self.linkPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.metadata.link.placeholder");
        self.linkValue = ko.observable("");

        // Formula field
        self.formulaLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.formula.label");
        self.formulaPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.metadata.formula.placeholder");
        self.formulaValue = ko.observable("");

        // Variables field
        self.variablesLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.variables.label");
        self.variablesPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.metadata.variables.placeholder");
        self.variablesValue = ko.observable("");

        // Method field
        self.methodLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.method.label");
        self.methodPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.metadata.method.placeholder");
        self.methodValue = ko.observable("");

        // Observations field
        self.observationsMLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.observations.label");
        self.observationsMPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.metadata.observations.placeholder");
        self.observationsMValue = ko.observable("");

        // Score
        self.scoreLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.score.label");

        // Score to percent converter
        self.scoreConverter = GeneralViewModel.converters.percent;

        // Red score field
        self.redLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.score.red");
        self.redValue = ko.observable(0.35);

        // Orange score field
        self.orangeLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.score.orange");
        self.orangeValue = ko.observable(0.6);

        // Yello score field
        self.yellowLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.score.yellow");
        self.yellowValue = ko.observable(0.8);

        // Green score field
        self.greenLabel = GeneralViewModel.nls("admin.indicators.form.sections.metadata.score.green");
        self.greenValue = ko.observable(1);

        /*
         * Goals and progress section
         */
        self.goalsTitle = GeneralViewModel.nls("admin.indicators.form.sections.goals.title");
        self.progressTitle = GeneralViewModel.nls("admin.indicators.form.sections.goals.alternative");

        // Chart series
        self.chartSeriesValue = ko.observableArray([]);

        // Goal/Progress ID
        self.goalId = Math.floor(Math.random() * 100) + 1;

        // Table headers
        self.goalsColumns = [
            {
                "headerText": "Valor",
                "headerStyle": 'max-width: 5em;',
                "style": 'min-width: 45%; width: 45%;',
                "sortable": "disabled"
            },
            {
                "headerText": "Fecha",
                "headerStyle": 'max-width: 5em;',
                "style": 'min-width: 45%; width: 45%;',
                "sortable": "auto"
            },
            {
                "headerText": 'Acciones',
                "headerStyle": 'max-width: 5em;',
                "style": 'min-width: 10%; width: 10%;',
                "sortable": "disabled"
            }
        ];

        // Goals table
        self.goalsLabel = GeneralViewModel.nls("admin.indicators.form.sections.goals.table.goals");
        self.goalObservableArray = ko.observableArray([]);
        self.goalDataSource = new oj.ArrayTableDataSource(self.goalObservableArray, { idAttribute: 'Id' });

        // Row template for Goals' table
        self.getGoalRowTemplate = function (data, context) {
            var mode = context.$rowContext['mode'];
            return mode === 'edit' ? 'goalEditRowTemplate' : 'goalRowTemplate';
        };

        // Progress table
        self.progressLabel = GeneralViewModel.nls("admin.indicators.form.sections.goals.table.progress");
        self.progressObservableArray = ko.observableArray([]);
        self.progressDataSource = new oj.ArrayTableDataSource(self.progressObservableArray, { idAttribute: 'Id' });

        // Row template for Progress' table
        self.getProgressRowTemplate = function (data, context) {
            var mode = context.$rowContext['mode'];
            return mode === 'edit' ? 'progressEditRowTemplate' : 'progressRowTemplate';
        };

        /**
         * Update chart values.
         */
        self.updateChart = function () {
            // New chart series
            var chartSeries = [
                { name: 'Metas', items: [] },
                { name: 'Avances', items: [] }
            ];

            // For each goal in Goals' table
            self.goalObservableArray().forEach(function (goal) {
                // Add new item to Chart series
                chartSeries[0].items.push({
                    x: goal.Date, // Goal date
                    value: goal.Value // Goal value
                });
            });

            // For each progress in Progress' table
            self.progressObservableArray().forEach(function (progress) {
                // Add new item to Chart Series
                chartSeries[1].items.push({
                    x: progress.Date, // Progress date
                    value: progress.Value // Progress value
                });
            });

            // Sort arrays by date
            chartSeries[0].items.sort(self.orderChartByDate);
            chartSeries[1].items.sort(self.orderChartByDate);

            // Set chart values
            self.chartSeriesValue(chartSeries);
        };

        /**
         * Order chart by date.
         *
         * @param elem1
         * @param elem2
         * @returns {int}
         */
        self.orderChartByDate = function (elem1, elem2) {
            if (elem1.x > elem2.x)
                return 1;
            else if (elem1.x < elem2.x)
                return -1;
            else if (elem1.x === elem2.x)
                return 0;
        };

        /**
         * Add new row table.
         *
         * @param {String} table
         * @returns {void}
         */
        self.addRow = function (table) {
            // New row
            var row = {
                'Id': self.goalId++,
                'Value': 0,
                'Date': oj.IntlConverterUtils.dateToLocalIso(new Date())
            };

            // Pick table
            if (table === 'Goals') {
                self.goalObservableArray.push(row);
            } else if (table === 'Progress') {
                self.progressObservableArray.push(row);
            }

            // Update chart values
            self.updateChart();
        };

        /**
         * Remove selected row.
         *
         * @param {String} table Table source.
         * @param {Object} row Goal/Progress object with ID, Value and Date.
         * @returns {void}
         */        
        self.removeRow = function (table, row) {
            if (table === 'Goals') {
                // Remove from Goals table
                self.goalObservableArray.remove(function (item) {
                    return item.Id === row.Id && item.Value === row.Value && item.Date === row.Date;
                });
            } else if (table === 'Progress') {
                // Remove from Progress table
                self.progressObservableArray.remove(function (item) {
                    return item.Id === row.Id && item.Value === row.Value && item.Date === row.Date;
                });
            }

            // Update chart values
            self.updateChart();
        };

        /**
         * Before Row Edit End event.
         *
         * @param {any} event
         * @param {any} ui
         * @returns {void}
         */
        self.beforeRowEditEnd = function (event, ui) {
            // Update chart values
            self.updateChart();
        };

        // Potential risk field
        self.riskLabel = GeneralViewModel.nls("admin.indicators.form.sections.goals.risk.label");
        self.riskPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.goals.risk.placeholder");
        self.riskValue = ko.observable("");

        // Implemented actions
        self.actionsLabel = GeneralViewModel.nls("admin.indicators.form.sections.goals.actions.label");
        self.actionsPlaceholder = GeneralViewModel.nls("admin.indicators.form.sections.goals.actions.placeholder");
        self.actionsValue = ko.observable("");

        /*
         * Components section
         */
        self.componentsTitle = GeneralViewModel.nls("admin.indicators.form.sections.components.title");

        // Name field
        self.comNameLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.name");
        self.comNameValue = ko.observable("");

        // Description field
        self.comDescriptionLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.description");
        self.comDescriptionValue = ko.observable("");

        // Indicator field
        self.comIndicatorLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.indicator");
        self.comIndicatorValue = ko.observable("");

        // Measure field
        self.comMeasureLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.measure");
        self.comMeasureValue = ko.observable("");

        // Initial value field
        self.comInitialValueLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.initialValue");
        self.comInitialValueValue = ko.observable("");

        // Final goal field
        self.comFinalGoalLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.finalGoal");
        self.comFinalGoalValue = ko.observable("");

        // General progress field
        self.comGeneralProgressLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.generalProgress");
        self.comGeneralProgressValue = ko.observable("");

        // Initial date field
        self.comInitialDateLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.initialDate");
        self.comInitialDateValue = ko.observable("");

        // Final date field
        self.comFinalDateLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.finalDate");
        self.comFinalDateValue = ko.observable("");

        // Responsible option
        self.comResponsibleLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.responsible");
        self.comResponsibleOptions = ko.observableArray([
            { "value": "Responsable", "label": "Responsable" }
        ]);
        self.comResponsibleValue = ko.observable("");

        // Justification field
        self.comJustificationLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.justification");
        self.comJustificationValue = ko.observable("");

        // Goals and progress table
        self.comGoalsLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.goals");

        // Month labels
        let months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        // Goals and progress table columns
        self.comGoalsColumns = [{
            "headerText": 'Mes',
            "headerStyle": 'max-width: 7.69%; width: 7.69%',
            "style": 'min-width: 7.69%; width: 7.69%;',
            "sortable": 'disabled'
        }];

        // For each month label
        months.forEach(function (month) {
            // Add new column to goals and progress table
            self.comGoalsColumns.push({
                "headerText": month,
                "headerStyle": 'max-width: 7.69%; width: 7.69%',
                "style": 'min-width: 7.69%; width: 7.69%;',
                "sortable": "disabled"
            });
        });

        // Goals observable array
        self.comGoalsObservableArray = ko.observableArray([
            {
                "Mes": "Meta",
                "Ene": ko.observable(2), "Feb": ko.observable(4), "Mar": ko.observable(6),
                "Abr": ko.observable(8), "May": ko.observable(10), "Jun": ko.observable(12),
                "Jul": ko.observable(14), "Ago": ko.observable(16), "Sep": ko.observable(18),
                "Oct": ko.observable(20), "Nov": ko.observable(22), "Dic": ko.observable(24)
            },
            {
                "Mes": "Valor",
                "Ene": ko.observable(1), "Feb": ko.observable(3), "Mar": ko.observable(5),
                "Abr": ko.observable(7), "May": ko.observable(9), "Jun": ko.observable(11),
                "Jul": ko.observable(13), "Ago": ko.observable(15), "Sep": ko.observable(17),
                "Oct": ko.observable(19), "Nov": ko.observable(21), "Dic": ko.observable(23)
            },
            {
                "Mes": "% Avance",
                "Ene": ko.observable(50.00), "Feb": ko.observable(75.00), "Mar": ko.observable(83.33),
                "Abr": ko.observable(87.50), "May": ko.observable(90.00), "Jun": ko.observable(91.66),
                "Jul": ko.observable(92.85), "Ago": ko.observable(93.75), "Sep": ko.observable(94.44),
                "Oct": ko.observable(95.00), "Nov": ko.observable(95.45), "Dic": ko.observable(95.83)
            }
        ]);

        /**
         * Components Goals and Progress option change event.
         * 
         * Triggered after changing an input value in Goals and
         * Progress table.
         * 
         * @param {*} event 
         * @param {*} ui 
         */
        self.comGoalsOptionChange = function (event, ui) {
            // If the value has changed and is not empty
            if (ui.value !== "" && ui.option === "value") {
                // Goals and values array
                let goals = [];
                let values = [];
                let count = 0;

                // For each row in goals and progress table
                self.comGoalsObservableArray().forEach(function (value, index) {
                    // If the current row is Goals
                    if (index === 0) {
                        // For each value in Goals row
                        for (let v in value) {
                            // Skip row name
                            if (value[v] !== "Meta") {
                                // Push goal in goals array
                                goals.push(value[v]());
                            }
                        }
                        // If the current row is Values
                    } else if (index === 1) {
                        // For each value in Values row
                        for (let v in value) {
                            // Skip row name
                            if (value[v] !== "Valor") {
                                // Push value in values array
                                values.push(value[v]());
                            }
                        }
                        // If the current row is Progress
                    } else if (index === 2) {
                        // For each value in Progress row
                        for (let v in value) {
                            // Skip row name
                            if (value[v] !== "% Avance") {
                                // Calculate the new value based in the column goals and values.
                                value[v](self.calculateProgress(goals[count], values[count]));
                                count++;
                            }
                        }
                    }
                });

                // Update chart values
                self.comUpdateChart();
            }
        };

        /**
         * Calculate Progress value.
         * 
         * This function calculates the progress based in the
         * expected goal and actual value.
         * 
         * @param {*} goal 
         * @param {*} value 
         */
        self.calculateProgress = function (goal, value) {
            let progress = parseFloat(value) / parseFloat(goal) * 100;
            return progress.toFixed(1);
        };

        // Table data source
        self.comGoalsDataSource = ko.observable(new oj.ArrayTableDataSource(self.comGoalsObservableArray, { idAttribute: "Mes" }));

        // Table row template
        self.comGoalsRowTemplate = function (data, context) {
            var mode = context.$rowContext['mode'];
            return mode === 'edit' ? 'comGoalsEditRowTemplate' : 'comGoalsRowTemplate';
        };

        // Goals and progress chart
        self.comChartGroupsValue = ko.observableArray(months);
        self.comChartSeriesValue = ko.observableArray([]);
        self.comChartYAxis = ko.observable();
        self.comChartY2Axis = {title: "Avances"};

        // Update reference line (final goal line) in goals and progress chart
        ko.computed(function () {
            self.comChartYAxis({
                title: "Meta",
                referenceObjects: [{
                    text: "Meta final",
                    type: "line",
                    value: self.comFinalGoalValue(),
                    color: '#A0CEEC',
                    displayInLegend: 'on',
                    lineWidth: 3,
                    location: 'back',
                    lineStyle: 'dashed',
                    shortDesc: 'Meta final del componente'
                }]
            });
        });

        /**
         * Update chart values.
         */
        self.comUpdateChart = function () {
            // New chart series
            var chartSeries = [
                { name: 'Metas', items: [] },
                { name: 'Avances', items: [], assignedToY2: 'on' }
            ];

            // For each goal in Goals' table
            self.comGoalsObservableArray().forEach(function (value, index) {
                if (index === 0) {
                    // For each value in Goals row
                    for (let v in value) {
                        // Skip row name
                        if (value[v] !== "Meta") {
                            // Add new item to Chart series
                            chartSeries[0].items.push(value[v]());
                        }
                    }
                } else if (index === 2) {
                    // For each value in Values row
                    for (let v in value) {
                        // Skip row name
                        if (value[v] !== "% Avance") {
                            // Add new item to Chart series
                            chartSeries[1].items.push(value[v]());
                        }
                    }
                }
            });

            // Set chart values
            self.comChartSeriesValue(chartSeries);
        };

        self.comUpdateChart();

        // Components table
        self.componentsTableLabel = GeneralViewModel.nls("admin.indicators.form.sections.components.table.title");
        self.componentsId = 1;
        self.componentsEnable = ko.observable(false);

        // Components table columns
        self.componentsColumns = [
            {
                "headerText": GeneralViewModel.nls("admin.indicators.form.sections.components.table.headers.name"),
                "headerStyle": 'max-width: 10%; width: 10%',
                "style": 'min-width: 90%; width: 90%;',
                "sortable": "auto"
            },
            {
                "headerText": GeneralViewModel.nls("admin.indicators.form.sections.components.table.headers.actions"),
                "headerStyle": 'max-width: 10%; width: 10%',
                "style": 'max-width: 10%; width: 10%',
                "sortable": "disabled"
            }
        ];

        // Components table observable array
        self.componentsObservableArray = ko.observableArray([]);

        // Get components data
        $.getJSON("data/components.json")
            .done(function (data) {
                $.each(data, function (index, value) {
                    self.componentsObservableArray.push(new ComponentItem(value));
                });
            });

        // Components table data source
        self.componentsDataSource = new oj.ArrayTableDataSource(self.componentsObservableArray, { idAttribute: 'id' });
    }

        return FormViewModel;
    }
);