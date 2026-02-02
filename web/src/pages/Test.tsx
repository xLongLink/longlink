import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"


export function Test() {
    const [enabled, setEnabled] = React.useState(false)
    const [textValue, setTextValue] = React.useState("")
    const [numberValue, setNumberValue] = React.useState(10)
    const [option, setOption] = React.useState("medium")

    return (
        <Card className="max-w-md">
            <CardHeader>
                <CardTitle>Example Settings</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Enable / Disable */}
                <div className="flex items-start gap-3">
                    <Checkbox
                        id="feature"
                        className="mt-1"
                        checked={enabled}
                        onCheckedChange={(v) => setEnabled(!!v)}
                    />
                    <div className="space-y-1">
                        <Label htmlFor="feature">Enable feature</Label>
                        <p className="text-sm text-muted-foreground">
                            Turn this on to activate the feature.
                        </p>
                    </div>
                </div>

                {/* Text input */}
                <div className="space-y-1">
                    <Label htmlFor="text">Text value</Label>
                    <p className="text-sm text-muted-foreground">
                        This value is used as a custom label or identifier.
                    </p>
                    <Input
                        id="text"
                        placeholder="Enter text"
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                    />
                </div>

                {/* Numeric input */}
                <div className="space-y-1">
                    <Label htmlFor="number">Numeric value</Label>
                    <p className="text-sm text-muted-foreground">
                        Controls the numeric threshold (0–100).
                    </p>
                    <Input
                        id="number"
                        type="number"
                        min={0}
                        max={100}
                        value={Number.isFinite(numberValue) ? numberValue : 0}
                        onChange={(e) => {
                            const next = e.target.value
                            setNumberValue(next === "" ? 0 : Number(next))
                        }}
                    />
                </div>

                {/* Options input */}
                <div className="space-y-1">
                    <Label>Mode</Label>
                    <p className="text-sm text-muted-foreground">
                        Select how aggressively the feature should operate.
                    </p>
                    <Select value={option} onValueChange={setOption}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    )
}
