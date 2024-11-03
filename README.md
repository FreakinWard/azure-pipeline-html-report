# azure-pipeline-html-report


Azure DevOps extension that provides a task for publishing report in a HTML format and embeds it into a Build and Release pages.

### Extension

In order to see report on tab one must first use `Publish HTML Report` task. This is supporting task which makes html tab visible.

This task takes one parameter - required `reportDir` which is a path to report directory and also optional `tabName` which is the name of the tab displayed within Azure DevOps report. 
#### Example YAML setup

```YAML
steps:
  - task: PublishHtmlReport@1
    displayName: 'Publish HTML Report'
    inputs:
      reportDir: '$(ResultsPath)/reportName.html'
```

### 2023-05-10 - Fixed tab name

This extension patches the original [HTML Viewer by Jakub Rumpca](https://marketplace.visualstudio.com/items?itemName=JakubRumpca.azure-pipelines-html-report) and resolves [#8 TabName incorrectly renders when using multi-stage pipelines](https://github.com/JakubRumpca/azure-pipeline-html-report/issues/8)

Before fix:

![githubIssue8.png](https://github.com/FreakinWard/azure-pipeline-html-report/blob/main/docs/githubIssue8.png?raw=true)

After fix:

![githubIssue8-fixed.png](https://github.com/FreakinWard/azure-pipeline-html-report/blob/main/docs/githubIssue8-fixed.png?raw=true)

```yaml

# tabName has a known bug w/multi-stages: https://github.com/JakubRumpca/azure-pipeline-html-report/issues/8
- task: PublishHtmlReport@1
  displayName: Publish E2E Test Report
  condition: succeededOrFailed()
  inputs:
    reportDir: 'cypress/reports/index.html'
    tabName: 'E2E ${{ parameters.region }}-${{ parameters.slotName }}'

```
