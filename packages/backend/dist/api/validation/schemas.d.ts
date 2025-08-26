import Joi from 'joi';
export declare const verifyContentSchema: {
    body: Joi.ObjectSchema<any>;
};
export declare const batchVerifySchema: {
    body: Joi.ObjectSchema<any>;
};
export declare const getResultsSchema: {
    params: Joi.ObjectSchema<any>;
    query: Joi.ObjectSchema<any>;
};
export declare const feedbackSchema: {
    body: Joi.ObjectSchema<any>;
};
export declare const validateFeedback: (data: any) => Joi.ValidationResult<any>;
//# sourceMappingURL=schemas.d.ts.map