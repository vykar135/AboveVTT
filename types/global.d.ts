interface Window {
    LOADING: boolean,
    pcs: any[],
    TOKEN_OBJECTS: { [id: string]: any },
    all_token_objects: { [id: string]: any },
    CAMPAIGN_INFO: any,
    AVTT_CAMPAIGN_INFO: any,
    ROUND_NUMBER: number | undefined,
    ddbConfigJson: { [key: string]: any },
    characterData: {
        [key: string]: any,
        id: string | undefined
    }
}

declare const AVTT_ENVIRONMENT: any;
declare const Cobalt: any;
declare const AboveApi: {
    setCampaignData: (campaign: any) => Promise<any>
};
declare const DDBApi: any;

declare function uuid();