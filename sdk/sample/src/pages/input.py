from src.app import app
from longlink import Page


@app.page("/input", name="Input", icon="input")
async def input_page() -> Page:
    page = Page()

    # Text input
    page.input(
        kind="text",
        label="Normal Input",
        placeholder="Lorem ipsum dolor sit amet",
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        submit="Save",
    )

    # Number input
    page.input(
        kind="number",
        label="Number Input",
        placeholder="Enter a number",
        description="This input only accepts numeric values.",
        submit="Save",
    )

    # Password input
    page.input(
        kind="password",
        label="Password Input",
        placeholder="Enter your password",
        description="This input hides the entered text.",
        submit="Save",
    )

    # Textarea input
    page.input(
        kind="textarea",
        label="Textarea Input",
        placeholder="Enter multiple lines of text",
        description="This input allows for longer text entries.",
        submit="Save",
    )


    # Standalone textarea element
    page.textarea(
        label="Standalone Textarea",
        placeholder="Write your notes here",
        description="This is a standalone textarea without save actions.",
    )

    # Date input
    page.input(
        kind="date",
        label="Date Input",
        description="Select a date from the calendar.",
        submit="Save",
    )

    # Datetime input
    page.input(
        kind="datetime",
        label="Datetime Input",
        description="Select a date and time from the calendar.",
        submit="Save",
    )

    # Select input
    page.input(
        kind="select",
        label="Select Input",
        options=[
            {"label": "Option 1", "value": "option_1"},
            {"label": "Option 2", "value": "option_2"},
            {"label": "Option 3", "value": "option_3"},
        ],
        submit="Save",
    )

    # Switch input
    page.input(
        kind="switch",
        label="Switch Input",
        description="Toggle this setting on or off.",
        submit="Save",
    )

    page.switch(
        label="Switch Input",
        description="Toggle this setting on or off.",
        active=True,
    )

    page.checkbox(
        label="Checkbox Input",
        description="Select this option if you agree.",
        checked=True,
    )

    return page