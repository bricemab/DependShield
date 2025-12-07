import { IsEnum, IsArray, IsUrl, IsBoolean, IsOptional } from 'class-validator';
import { WebhookType, WebhookEvent } from '../webhook.entity';

export class CreateWebhookDto {
    @IsUrl()
    url: string;

    @IsEnum(WebhookType)
    type: WebhookType;

    @IsArray()
    @IsEnum(WebhookEvent, { each: true })
    events: WebhookEvent[];

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
