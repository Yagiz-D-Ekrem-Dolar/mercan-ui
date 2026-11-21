"use client"

import {
  HyperparameterSpec,
  formatSettingValue,
  getHyperparameterSpecs,
  parseStopSequences,
  stopSequencesToText
} from "@/lib/mercan/hyperparameters"
import { DEFAULT_CHAT_SETTINGS, clampChatSettings } from "@/lib/mercan/settings"
import { ChatSettings } from "@/types"
import { IconInfoCircle, IconRestore } from "@tabler/icons-react"
import { FC, useEffect, useState } from "react"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Slider } from "./slider"
import { TextareaAutosize } from "./textarea-autosize"
import { WithTooltip } from "./with-tooltip"

interface HyperparameterSliderProps {
  spec: HyperparameterSpec
  value: number
  onChange: (value: number) => void
}

const InfoTip: FC<{ text: string }> = ({ text }) => (
  <WithTooltip
    delayDuration={0}
    side="bottom"
    display={
      <div className="w-[260px] p-1 text-sm font-normal leading-snug">
        {text}
      </div>
    }
    trigger={
      <IconInfoCircle
        className="text-muted-foreground cursor-help hover:opacity-50"
        size={16}
      />
    }
  />
)

const HyperparameterSlider: FC<HyperparameterSliderProps> = ({
  spec,
  value,
  onChange
}) => {
  return (
    <div className="space-y-3">
      <Label className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <div>{spec.label}:</div>

          <div>{formatSettingValue(value, spec.decimals)}</div>

          <InfoTip text={spec.hint} />
        </div>

        <div className="text-muted-foreground font-mono text-xs font-normal">
          {spec.param}
        </div>
      </Label>

      <Slider
        value={[value]}
        onValueChange={values => onChange(values[0])}
        min={spec.min}
        max={spec.max}
        step={spec.step}
      />
    </div>
  )
}

interface SettingsFormProps {
  settings: ChatSettings
  onChange: (value: ChatSettings) => void
}

// Ayarlar panelindeki form: sistem istemi + Mercan hiperparametreleri.
export const SettingsForm: FC<SettingsFormProps> = ({ settings, onChange }) => {
  const [stopText, setStopText] = useState(
    stopSequencesToText(settings.stopSequences)
  )

  // Ayarlar dışarıdan değişirse (sıfırlama) metin kutusunu eşitle.
  useEffect(() => {
    if (
      JSON.stringify(parseStopSequences(stopText)) !==
      JSON.stringify(settings.stopSequences)
    ) {
      setStopText(stopSequencesToText(settings.stopSequences))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.stopSequences])

  const specs = getHyperparameterSpecs(settings.model)

  const handleReset = () => {
    onChange(clampChatSettings({ ...DEFAULT_CHAT_SETTINGS, model: settings.model }))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Label className="flex items-center space-x-1">
          <div>Sistem İstemi</div>

          <InfoTip text="Mercan'ın her sohbette uyduğu temel talimat. Modele sistem mesajı olarak gönderilir." />
        </Label>

        <TextareaAutosize
          className="bg-background border-input border-2"
          placeholder="Sen yardımsever bir Türkçe yapay zekâ asistanısın."
          onValueChange={prompt => onChange({ ...settings, prompt })}
          value={settings.prompt}
          minRows={3}
          maxRows={8}
        />
      </div>

      <div className="space-y-6">
        <div className="font-bold">Hiperparametreler</div>

        {specs.map(spec => (
          <HyperparameterSlider
            key={spec.key}
            spec={spec}
            value={settings[spec.key]}
            onChange={value => onChange({ ...settings, [spec.key]: value })}
          />
        ))}

        <div className="space-y-1">
          <Label className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <div>Durdurma dizileri</div>

              <InfoTip text="Model bu metinlerden birini ürettiği anda yanıtı keser. Birden fazla diziyi virgülle ayırın. Sunucunun kendi bitiş işaretleri her zaman geçerlidir." />
            </div>

            <div className="text-muted-foreground font-mono text-xs font-normal">
              stop
            </div>
          </Label>

          <Input
            placeholder="Örn: ###, Soru:"
            value={stopText}
            onChange={e => {
              setStopText(e.target.value)
              onChange({
                ...settings,
                stopSequences: parseStopSequences(e.target.value)
              })
            }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={handleReset}
        >
          <IconRestore className="mr-1" size={16} />
          Varsayılanlara dön
        </Button>
      </div>
    </div>
  )
}
