const { isUndefined, isString, isArray } = require('lodash');
const getCollectionServerId = (collection_id, collection_list) => {

    // step1:建立索引
    const parents_data = {}

    if (isArray(collection_list)) {
        collection_list.forEach(data => {
            parents_data[data?.target_id] = data;
        })
    }

    //递归查找
    const digFind = (target_id) => {
        const result = 'default'; // 默认使用default
        const targetInfo = parents_data?.[target_id];
        if (isUndefined(targetInfo)) {
            return result;
        }
        if (isString(targetInfo?.server_id) && targetInfo.server_id?.length > 0) {
            return targetInfo.server_id;
        }
        return digFind(targetInfo.parent_id);
    }
    return digFind(collection_id);
};



module.exports = {
    getCollectionServerId
}