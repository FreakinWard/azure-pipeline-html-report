const tl = require('azure-pipelines-task-lib');
const { resolve } = require('path');
const dashify = require('dashify')

try {
    let reportDir = tl.getPathInput('reportDir', true, true);
    let fileName = tl.getInput('fileName', true, true)
    const jobName = dashify(tl.getVariable('Agent.JobName'))
    const stageName = dashify(tl.getVariable('System.StageDisplayName'))
    const stageAttempt = tl.getVariable('System.StageAttempt')
    const tabName = tl.getInput('tabName', false ) || 'Html Report'
    let path = resolve(reportDir + fileName)
    tl.addAttachment('report-html', `${tabName}.${jobName}.${stageName}.${stageAttempt}`, path)  
} catch (error) {
    tl.setResult(tl.TaskResult.SucceededWithIssues, error.message);
}