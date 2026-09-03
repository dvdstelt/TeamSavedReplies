const canLoadSavedRepliesForURL = async (url) =>{

    const sources = await getSources();

    for(let source of sources){

        if(sourceAppliesToUrl(source, url)){
            return true;
        }
    }

    return false;
}
