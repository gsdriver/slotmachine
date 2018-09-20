//
// copy StandardSkillFactory.js ..\lambda\custom\node_modules\ask-sdk\dist\skill\factory
// to replace the default StandardSkillFactory
// This will allow you to use the same DB schema as before
//

'use strict';
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ask_sdk_core_1 = require("ask-sdk-core");
var ask_sdk_dynamodb_persistence_adapter_1 = require("ask-sdk-dynamodb-persistence-adapter");
/**
 * Provider for {@link StandardSkillBuilder}.
 */
var StandardSkillFactory = /** @class */ (function () {
    function StandardSkillFactory() {
    }
    StandardSkillFactory.init = function () {
        var thisTableName;
        var thisAutoCreateTable;
        var thisPartitionKeyGenerator;
        var thisDynamoDbClient;
        var thisPartitionKeyName = 'userId';
        var thisAttributesName = 'mapAttr';
        var baseSkillBuilder = ask_sdk_core_1.BaseSkillFactory.init();
        return __assign({}, baseSkillBuilder, { getSkillConfiguration: function () {
                var skillConfiguration = baseSkillBuilder.getSkillConfiguration();
                return __assign({}, skillConfiguration, { persistenceAdapter: thisTableName
                        ? new ask_sdk_dynamodb_persistence_adapter_1.DynamoDbPersistenceAdapter({
                            tableName: thisTableName,
                            createTable: thisAutoCreateTable,
                            partitionKeyGenerator: thisPartitionKeyGenerator,
                            dynamoDBClient: thisDynamoDbClient,
                            attributesName: thisAttributesName,
                            partitionKeyName: thisPartitionKeyName,
                        })
                        : undefined, apiClient: new ask_sdk_core_1.DefaultApiClient() });
            },
            withTableName: function (tableName) {
                thisTableName = tableName;
                return this;
            },
            withAutoCreateTable: function (autoCreateTable) {
                thisAutoCreateTable = autoCreateTable;
                return this;
            },
            withPartitionKeyGenerator: function (partitionKeyGenerator) {
                thisPartitionKeyGenerator = partitionKeyGenerator;
                return this;
            },
            withDynamoDbClient: function (dynamoDbClient) {
                thisDynamoDbClient = dynamoDbClient;
                return this;
            } });
    };
    return StandardSkillFactory;
}());
exports.StandardSkillFactory = StandardSkillFactory;
//# sourceMappingURL=StandardSkillFactory.js.map